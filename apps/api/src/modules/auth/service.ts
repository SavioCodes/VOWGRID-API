import type {
  AuthSuccessResponse,
  AuthenticatedUserResponse,
  AuthenticatedWorkspaceResponse,
  CurrentSessionResponse,
  LoginInput,
  SignupInput,
} from '@vowgrid/contracts';
import { BILLING_TRIAL_DAYS } from '@vowgrid/contracts';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ConflictError, UnauthorizedError } from '../../common/errors.js';
import { emitAuditEvent } from '../audits/service.js';
import {
  buildSessionExpiry,
  generateSessionToken,
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from './security.js';

type SessionRecord = {
  id: string;
  userId: string;
  workspaceId: string;
  tokenHash: string;
  expiresAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type SessionLookup = {
  id: string;
  workspaceId: string;
  expiresAt: Date;
  lastUsedAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    workspaceId: string;
    createdAt: Date;
    updatedAt: Date;
    workspace: {
      id: string;
      name: string;
      slug: string;
      createdAt: Date;
      updatedAt: Date;
    };
  };
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function slugifyWorkspaceName(name: string) {
  const normalized = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'workspace';
}

async function createUniqueWorkspaceSlug(name: string) {
  const base = slugifyWorkspaceName(name).slice(0, 48);

  for (let suffix = 0; suffix < 1000; suffix += 1) {
    const slug = suffix === 0 ? base : `${base}-${suffix + 1}`.slice(0, 56);
    const existing = await prisma.workspace.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }
  }

  return `${base}-${Date.now()}`;
}

function toAuthenticatedUser(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
}): AuthenticatedUserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    workspaceId: user.workspaceId,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function toAuthenticatedWorkspace(workspace: {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}): AuthenticatedWorkspaceResponse {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
  };
}

async function createSession(
  db: Prisma.TransactionClient | typeof prisma,
  userId: string,
  workspaceId: string,
) {
  const token = generateSessionToken();
  const expiresAt = buildSessionExpiry();
  const session = (await db.userSession.create({
    data: {
      userId,
      workspaceId,
      tokenHash: hashSessionToken(token),
      expiresAt,
    },
  })) as SessionRecord;

  return { token, session };
}

async function findSessionByToken(token: string): Promise<SessionLookup | null> {
  const session = await prisma.userSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: {
      id: true,
      workspaceId: true,
      expiresAt: true,
      lastUsedAt: true,
      createdAt: true,
      revokedAt: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          workspaceId: true,
          createdAt: true,
          updatedAt: true,
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.revokedAt) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await prisma.userSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    return null;
  }

  return session;
}

function buildAuthSuccessResponse({
  user,
  workspace,
  session,
  token,
}: {
  user: AuthenticatedUserResponse;
  workspace: AuthenticatedWorkspaceResponse;
  session: SessionRecord;
  token: string;
}): AuthSuccessResponse {
  return {
    user,
    workspace,
    session: {
      token,
      expiresAt: session.expiresAt.toISOString(),
    },
  };
}

function buildCurrentSessionResponse(session: SessionLookup): CurrentSessionResponse {
  return {
    user: toAuthenticatedUser(session.user),
    workspace: toAuthenticatedWorkspace(session.user.workspace),
    session: {
      id: session.id,
      expiresAt: session.expiresAt.toISOString(),
      lastUsedAt: session.lastUsedAt?.toISOString() ?? null,
      createdAt: session.createdAt.toISOString(),
    },
  };
}

export async function signupDashboardUser(input: SignupInput): Promise<AuthSuccessResponse> {
  const email = normalizeEmail(input.email);
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new ConflictError('A user with this email already exists.');
  }

  const passwordHash = await hashPassword(input.password);
  const workspaceSlug = await createUniqueWorkspaceSlug(input.workspaceName);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: {
        name: input.workspaceName.trim(),
        slug: workspaceSlug,
      },
    });

    const user = await tx.user.create({
      data: {
        email,
        name: input.name.trim(),
        role: 'owner',
        passwordHash,
        workspaceId: workspace.id,
      },
    });

    await tx.trialState.create({
      data: {
        workspaceId: workspace.id,
        status: 'active',
        startsAt: now,
        endsAt: addDays(now, BILLING_TRIAL_DAYS),
      },
    });

    await tx.billingCustomer.create({
      data: {
        workspaceId: workspace.id,
        email,
        legalName: workspace.name,
      },
    });

    const createdSession = await createSession(tx, user.id, workspace.id);

    return {
      workspace,
      user,
      session: createdSession.session,
      token: createdSession.token,
    };
  });

  await emitAuditEvent({
    action: 'auth.signup',
    entityType: 'workspace',
    entityId: result.workspace.id,
    actorType: 'user',
    actorId: result.user.id,
    workspaceId: result.workspace.id,
    metadata: {
      email,
      role: result.user.role,
    },
  });

  return buildAuthSuccessResponse({
    user: toAuthenticatedUser(result.user),
    workspace: toAuthenticatedWorkspace(result.workspace),
    session: result.session,
    token: result.token,
  });
}

export async function loginDashboardUser(input: LoginInput): Promise<AuthSuccessResponse> {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      workspace: true,
    },
  });

  if (!user?.passwordHash) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return createSession(tx, user.id, user.workspaceId);
  });

  await emitAuditEvent({
    action: 'auth.login',
    entityType: 'user',
    entityId: user.id,
    actorType: 'user',
    actorId: user.id,
    workspaceId: user.workspaceId,
    metadata: {
      email,
      sessionId: result.session.id,
    },
  });

  return buildAuthSuccessResponse({
    user: toAuthenticatedUser(user),
    workspace: toAuthenticatedWorkspace(user.workspace),
    session: result.session,
    token: result.token,
  });
}

export async function getCurrentDashboardSession(token: string): Promise<CurrentSessionResponse> {
  const session = await findSessionByToken(token);

  if (!session) {
    throw new UnauthorizedError('Invalid or expired session.');
  }

  prisma.userSession
    .update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => undefined);

  return buildCurrentSessionResponse(session);
}

export async function getSessionAuthenticationContext(token: string) {
  const session = await findSessionByToken(token);

  if (!session) {
    throw new UnauthorizedError('Invalid or expired session.');
  }

  prisma.userSession
    .update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => undefined);

  return {
    sessionId: session.id,
    userId: session.user.id,
    workspaceId: session.workspaceId,
    role: session.user.role,
  };
}

export async function logoutDashboardSession(sessionId: string) {
  await prisma.userSession.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  });
}
