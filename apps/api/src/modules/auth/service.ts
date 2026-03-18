import type {
  OAuthCompleteInput,
  OAuthCompletionResponse,
  AuthSuccessResponse,
  AuthenticatedUserResponse,
  AuthenticatedWorkspaceResponse,
  AvailableWorkspaceResponse,
  CompleteOauthSignupInput,
  CurrentSessionResponse,
  EmailVerificationResponse,
  LoginInput,
  PasswordResetConfirmInput,
  PasswordResetConfirmResponse,
  PasswordResetRequestInput,
  PasswordResetRequestResponse,
  RequestEmailVerificationResponse,
  SignupInput,
  WorkspaceSwitchResponse,
  AcceptWorkspaceInviteInput,
} from '@vowgrid/contracts';
import { BILLING_TRIAL_DAYS } from '@vowgrid/contracts';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { observeAuthEvent } from '../../lib/metrics.js';
import {
  ConflictError,
  UnauthorizedError,
  ValidationError,
  NotFoundError,
} from '../../common/errors.js';
import { emitAuditEvent } from '../audits/service.js';
import { sendAuthEmail } from './mailer.js';
import {
  buildSessionExpiry,
  generateOpaqueToken,
  generateSessionToken,
  hashOpaqueToken,
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from './security.js';
import { env } from '../../config/env.js';

const EMAIL_VERIFICATION_TTL_HOURS = 48;
const PASSWORD_RESET_TTL_HOURS = 2;
const OAUTH_SIGNUP_TTL_HOURS = 1;

type DbClient = Prisma.TransactionClient | typeof prisma;

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

type UserRecord = {
  id: string;
  email: string;
  name: string;
  role: string;
  passwordHash: string | null;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  disabledAt: Date | null;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
};

type WorkspaceRecord = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
};

type MembershipRecord = {
  id: string;
  userId: string;
  workspaceId: string;
  role: string;
  disabledAt: Date | null;
  joinedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  workspace: WorkspaceRecord;
};

type SessionLookup = {
  session: SessionRecord;
  user: UserRecord;
  currentMembership: MembershipRecord;
  availableWorkspaces: AvailableWorkspaceResponse[];
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
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

function buildAppUrl(path: string) {
  return new URL(path, env.APP_WEB_BASE_URL).toString();
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

function toAuthenticatedWorkspace(workspace: WorkspaceRecord): AuthenticatedWorkspaceResponse {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
  };
}

function toAuthenticatedUser(
  user: UserRecord,
  currentRole: string,
  currentWorkspaceId: string,
): AuthenticatedUserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: currentRole,
    workspaceId: currentWorkspaceId,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function serializeAvailableWorkspace(
  record: MembershipRecord,
  defaultWorkspaceId: string,
): AvailableWorkspaceResponse {
  return {
    workspaceId: record.workspaceId,
    name: record.workspace.name,
    slug: record.workspace.slug,
    role: record.role,
    status: record.disabledAt ? 'disabled' : 'active',
    isDefault: record.workspaceId === defaultWorkspaceId,
    disabledAt: record.disabledAt?.toISOString() ?? null,
  };
}

async function ensurePrimaryMembership(db: DbClient, user: UserRecord) {
  return db.workspaceMembership.upsert({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId: user.workspaceId,
      },
    },
    update: {
      role: user.role,
    },
    create: {
      userId: user.id,
      workspaceId: user.workspaceId,
      role: user.role,
      disabledAt: user.disabledAt,
      joinedAt: user.createdAt,
    },
  });
}

async function listMembershipRecords(
  userId: string,
  defaultWorkspaceId: string,
): Promise<Array<MembershipRecord>> {
  const records = await prisma.workspaceMembership.findMany({
    where: { userId },
    include: {
      workspace: true,
    },
    orderBy: [{ disabledAt: 'asc' }, { createdAt: 'asc' }],
  });

  return records.sort((left, right) => {
    if (left.disabledAt && !right.disabledAt) {
      return 1;
    }

    if (!left.disabledAt && right.disabledAt) {
      return -1;
    }

    if (left.workspaceId === defaultWorkspaceId) {
      return -1;
    }

    if (right.workspaceId === defaultWorkspaceId) {
      return 1;
    }

    return left.workspace.name.localeCompare(right.workspace.name);
  });
}

function resolveActiveMembership(
  memberships: Array<MembershipRecord>,
  preferredWorkspaceId: string,
): MembershipRecord {
  const activeMemberships = memberships.filter((membership) => !membership.disabledAt);

  if (activeMemberships.length === 0) {
    throw new UnauthorizedError(
      'This account does not currently have access to any active workspace.',
    );
  }

  return (
    activeMemberships.find((membership) => membership.workspaceId === preferredWorkspaceId) ??
    activeMemberships[0]
  );
}

async function loadUserMembershipContext(user: UserRecord, preferredWorkspaceId: string) {
  await ensurePrimaryMembership(prisma, user);
  const memberships = await listMembershipRecords(user.id, user.workspaceId);
  const currentMembership = resolveActiveMembership(memberships, preferredWorkspaceId);

  return {
    currentMembership,
    availableWorkspaces: memberships.map((membership) =>
      serializeAvailableWorkspace(membership, user.workspaceId),
    ),
  };
}

async function createSession(db: DbClient, userId: string, workspaceId: string) {
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

async function createEmailVerificationToken(db: DbClient, userId: string, email: string) {
  await db.emailVerificationToken.updateMany({
    where: {
      userId,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });

  const token = generateOpaqueToken();
  await db.emailVerificationToken.create({
    data: {
      userId,
      email,
      tokenHash: hashOpaqueToken(token),
      expiresAt: addHours(new Date(), EMAIL_VERIFICATION_TTL_HOURS),
    },
  });

  return token;
}

async function createPasswordResetToken(db: DbClient, userId: string) {
  await db.passwordResetToken.updateMany({
    where: {
      userId,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });

  const token = generateOpaqueToken();
  await db.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashOpaqueToken(token),
      expiresAt: addHours(new Date(), PASSWORD_RESET_TTL_HOURS),
    },
  });

  return token;
}

async function createOauthSignupToken(
  db: DbClient,
  input: {
    provider: OAuthCompleteInput['provider'];
    providerAccountId: string;
    email: string;
    name: string;
  },
) {
  await db.oAuthSignupToken.updateMany({
    where: {
      usedAt: null,
      OR: [
        {
          provider: input.provider,
          providerAccountId: input.providerAccountId,
        },
        {
          email: input.email,
        },
      ],
    },
    data: {
      usedAt: new Date(),
    },
  });

  const token = generateOpaqueToken();
  await db.oAuthSignupToken.create({
    data: {
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      email: input.email,
      name: input.name,
      tokenHash: hashOpaqueToken(token),
      expiresAt: addHours(new Date(), OAUTH_SIGNUP_TTL_HOURS),
    },
  });

  return token;
}

async function sendVerificationEmail(input: { email: string; name: string; token: string }) {
  const verificationUrl = buildAppUrl(`/verify-email?token=${encodeURIComponent(input.token)}`);
  await sendAuthEmail({
    to: input.email,
    subject: 'Verify your VowGrid email',
    text: `Hi ${input.name}, verify your VowGrid email by opening: ${verificationUrl}`,
    html: `<p>Hi ${input.name},</p><p>Verify your VowGrid email by opening <a href="${verificationUrl}">${verificationUrl}</a>.</p>`,
  });
}

async function sendPasswordResetEmail(input: { email: string; name: string; token: string }) {
  const resetUrl = buildAppUrl(`/reset-password?token=${encodeURIComponent(input.token)}`);
  await sendAuthEmail({
    to: input.email,
    subject: 'Reset your VowGrid password',
    text: `Hi ${input.name}, reset your VowGrid password by opening: ${resetUrl}`,
    html: `<p>Hi ${input.name},</p><p>Reset your VowGrid password by opening <a href="${resetUrl}">${resetUrl}</a>.</p>`,
  });
}

function buildAuthSuccessResponse({
  user,
  workspace,
  session,
  token,
  availableWorkspaces,
}: {
  user: AuthenticatedUserResponse;
  workspace: AuthenticatedWorkspaceResponse;
  session: SessionRecord;
  token: string;
  availableWorkspaces: AvailableWorkspaceResponse[];
}): AuthSuccessResponse {
  return {
    user,
    workspace,
    session: {
      token,
      expiresAt: session.expiresAt.toISOString(),
    },
    availableWorkspaces,
    emailVerificationRequired: user.emailVerifiedAt === null,
  };
}

function buildCurrentSessionResponse(sessionLookup: SessionLookup): CurrentSessionResponse {
  return {
    user: toAuthenticatedUser(
      sessionLookup.user,
      sessionLookup.currentMembership.role,
      sessionLookup.currentMembership.workspaceId,
    ),
    workspace: toAuthenticatedWorkspace(sessionLookup.currentMembership.workspace),
    session: {
      id: sessionLookup.session.id,
      expiresAt: sessionLookup.session.expiresAt.toISOString(),
      lastUsedAt: sessionLookup.session.lastUsedAt?.toISOString() ?? null,
      createdAt: sessionLookup.session.createdAt.toISOString(),
    },
    availableWorkspaces: sessionLookup.availableWorkspaces,
    emailVerificationRequired: sessionLookup.user.emailVerifiedAt === null,
  };
}

async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      workspace: true,
    },
  });
}

async function getUserByOauthAccount(provider: string, providerAccountId: string) {
  return prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId,
      },
    },
    include: {
      user: {
        include: {
          workspace: true,
        },
      },
    },
  });
}

async function findSessionByToken(token: string): Promise<SessionLookup | null> {
  const session = await prisma.userSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: {
      id: true,
      userId: true,
      workspaceId: true,
      tokenHash: true,
      expiresAt: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          passwordHash: true,
          emailVerifiedAt: true,
          lastLoginAt: true,
          disabledAt: true,
          workspaceId: true,
          createdAt: true,
          updatedAt: true,
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

  if (session.user.disabledAt) {
    await prisma.userSession.updateMany({
      where: {
        userId: session.user.id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
    return null;
  }

  await ensurePrimaryMembership(prisma, session.user);

  const currentMembership = await prisma.workspaceMembership.findUnique({
    where: {
      userId_workspaceId: {
        userId: session.user.id,
        workspaceId: session.workspaceId,
      },
    },
    include: {
      workspace: true,
    },
  });

  if (!currentMembership || currentMembership.disabledAt) {
    await prisma.userSession.updateMany({
      where: {
        userId: session.user.id,
        workspaceId: session.workspaceId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
    return null;
  }

  const memberships = await listMembershipRecords(session.user.id, session.user.workspaceId);
  const availableWorkspaces = memberships.map((membership) =>
    serializeAvailableWorkspace(membership, session.user.workspaceId),
  );

  return {
    session,
    user: session.user,
    currentMembership,
    availableWorkspaces,
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
      include: {
        workspace: true,
      },
    });

    await tx.workspaceMembership.create({
      data: {
        userId: user.id,
        workspaceId: workspace.id,
        role: 'owner',
        joinedAt: now,
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
    const verificationToken = await createEmailVerificationToken(tx, user.id, email);

    return {
      workspace,
      user,
      session: createdSession.session,
      token: createdSession.token,
      verificationToken,
    };
  });

  await sendVerificationEmail({
    email,
    name: result.user.name,
    token: result.verificationToken,
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
      role: 'owner',
    },
  });

  observeAuthEvent('signup', 'password');

  return buildAuthSuccessResponse({
    user: toAuthenticatedUser(result.user, 'owner', result.workspace.id),
    workspace: toAuthenticatedWorkspace(result.workspace),
    session: result.session,
    token: result.token,
    availableWorkspaces: [
      {
        workspaceId: result.workspace.id,
        name: result.workspace.name,
        slug: result.workspace.slug,
        role: 'owner',
        status: 'active',
        isDefault: true,
        disabledAt: null,
      },
    ],
  });
}

export async function loginDashboardUser(input: LoginInput): Promise<AuthSuccessResponse> {
  const email = normalizeEmail(input.email);
  const user = await getUserByEmail(email);

  if (!user?.passwordHash) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  if (user.disabledAt) {
    throw new UnauthorizedError('This account has been disabled. Contact your workspace owner.');
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  const membershipContext = await loadUserMembershipContext(user, user.workspaceId);
  const result = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return createSession(tx, user.id, membershipContext.currentMembership.workspaceId);
  });

  await emitAuditEvent({
    action: 'auth.login',
    entityType: 'user',
    entityId: user.id,
    actorType: 'user',
    actorId: user.id,
    workspaceId: membershipContext.currentMembership.workspaceId,
    metadata: {
      email,
      sessionId: result.session.id,
    },
  });

  observeAuthEvent('login', 'password');

  return buildAuthSuccessResponse({
    user: toAuthenticatedUser(
      user,
      membershipContext.currentMembership.role,
      membershipContext.currentMembership.workspaceId,
    ),
    workspace: toAuthenticatedWorkspace(membershipContext.currentMembership.workspace),
    session: result.session,
    token: result.token,
    availableWorkspaces: membershipContext.availableWorkspaces,
  });
}

export async function completeDashboardOauth(
  input: OAuthCompleteInput,
): Promise<OAuthCompletionResponse> {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  const linkedAccount = await getUserByOauthAccount(input.provider, input.providerAccountId);

  if (linkedAccount?.user.disabledAt) {
    throw new UnauthorizedError('This account has been disabled. Contact your workspace owner.');
  }

  if (linkedAccount) {
    const membershipContext = await loadUserMembershipContext(
      linkedAccount.user,
      linkedAccount.user.workspaceId,
    );
    const result = await prisma.$transaction((tx) =>
      createSession(tx, linkedAccount.user.id, membershipContext.currentMembership.workspaceId),
    );

    await emitAuditEvent({
      action: 'auth.oauth.login',
      entityType: 'user',
      entityId: linkedAccount.user.id,
      actorType: 'user',
      actorId: linkedAccount.user.id,
      workspaceId: membershipContext.currentMembership.workspaceId,
      metadata: {
        provider: input.provider,
        email,
      },
    });

    observeAuthEvent('login', input.provider);

    return {
      kind: 'authenticated',
      auth: buildAuthSuccessResponse({
        user: toAuthenticatedUser(
          linkedAccount.user,
          membershipContext.currentMembership.role,
          membershipContext.currentMembership.workspaceId,
        ),
        workspace: toAuthenticatedWorkspace(membershipContext.currentMembership.workspace),
        session: result.session,
        token: result.token,
        availableWorkspaces: membershipContext.availableWorkspaces,
      }),
    };
  }

  const existingUser = await getUserByEmail(email);

  if (existingUser?.disabledAt) {
    throw new UnauthorizedError('This account has been disabled. Contact your workspace owner.');
  }

  if (existingUser) {
    const membershipContext = await loadUserMembershipContext(
      existingUser,
      existingUser.workspaceId,
    );
    const result = await prisma.$transaction(async (tx) => {
      await tx.oAuthAccount.create({
        data: {
          userId: existingUser.id,
          provider: input.provider,
          providerAccountId: input.providerAccountId,
          email,
        },
      });

      if (!existingUser.emailVerifiedAt) {
        await tx.user.update({
          where: { id: existingUser.id },
          data: {
            emailVerifiedAt: new Date(),
          },
        });
      }

      return createSession(tx, existingUser.id, membershipContext.currentMembership.workspaceId);
    });

    await emitAuditEvent({
      action: 'auth.oauth.linked',
      entityType: 'user',
      entityId: existingUser.id,
      actorType: 'user',
      actorId: existingUser.id,
      workspaceId: membershipContext.currentMembership.workspaceId,
      metadata: {
        provider: input.provider,
        email,
      },
    });

    observeAuthEvent('link', input.provider);

    return {
      kind: 'authenticated',
      auth: buildAuthSuccessResponse({
        user: toAuthenticatedUser(
          {
            ...existingUser,
            emailVerifiedAt: existingUser.emailVerifiedAt ?? new Date(),
          },
          membershipContext.currentMembership.role,
          membershipContext.currentMembership.workspaceId,
        ),
        workspace: toAuthenticatedWorkspace(membershipContext.currentMembership.workspace),
        session: result.session,
        token: result.token,
        availableWorkspaces: membershipContext.availableWorkspaces,
      }),
    };
  }

  const signupToken = await prisma.$transaction((tx) =>
    createOauthSignupToken(tx, {
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      email,
      name,
    }),
  );

  return {
    kind: 'signup_required',
    candidate: {
      token: signupToken,
      provider: input.provider,
      email,
      name,
    },
  };
}

export async function completeDashboardOauthSignup(
  input: CompleteOauthSignupInput,
): Promise<AuthSuccessResponse> {
  const pendingSignup = await prisma.oAuthSignupToken.findUnique({
    where: {
      tokenHash: hashOpaqueToken(input.token),
    },
  });

  if (!pendingSignup || pendingSignup.usedAt || pendingSignup.expiresAt <= new Date()) {
    throw new ValidationError('Invalid or expired OAuth signup token.');
  }

  const workspaceSlug = await createUniqueWorkspaceSlug(input.workspaceName);
  const email = normalizeEmail(pendingSignup.email);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: {
        name: input.workspaceName.trim(),
        slug: workspaceSlug,
      },
    });

    let user = await tx.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await tx.user.create({
        data: {
          email,
          name: pendingSignup.name,
          role: 'owner',
          workspaceId: workspace.id,
          emailVerifiedAt: now,
        },
      });
    } else {
      if (user.disabledAt) {
        throw new UnauthorizedError(
          'This account has been disabled. Contact your workspace owner.',
        );
      }

      user = await tx.user.update({
        where: { id: user.id },
        data: {
          name: user.name || pendingSignup.name,
          role: 'owner',
          workspaceId: workspace.id,
          emailVerifiedAt: user.emailVerifiedAt ?? now,
        },
      });
    }

    await tx.workspaceMembership.create({
      data: {
        userId: user.id,
        workspaceId: workspace.id,
        role: 'owner',
        joinedAt: now,
      },
    });

    await tx.oAuthAccount.create({
      data: {
        userId: user.id,
        provider: pendingSignup.provider,
        providerAccountId: pendingSignup.providerAccountId,
        email,
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

    await tx.oAuthSignupToken.update({
      where: { id: pendingSignup.id },
      data: {
        usedAt: now,
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
    action: 'auth.oauth.signup',
    entityType: 'workspace',
    entityId: result.workspace.id,
    actorType: 'user',
    actorId: result.user.id,
    workspaceId: result.workspace.id,
    metadata: {
      email,
      provider: pendingSignup.provider,
      role: 'owner',
    },
  });

  observeAuthEvent('signup', pendingSignup.provider);

  const memberships = await listMembershipRecords(result.user.id, result.user.workspaceId);

  return buildAuthSuccessResponse({
    user: toAuthenticatedUser(result.user, 'owner', result.workspace.id),
    workspace: toAuthenticatedWorkspace(result.workspace),
    session: result.session,
    token: result.token,
    availableWorkspaces: memberships.map((membership) =>
      serializeAvailableWorkspace(membership, result.user.workspaceId),
    ),
  });
}

export async function getCurrentDashboardSession(token: string): Promise<CurrentSessionResponse> {
  const session = await findSessionByToken(token);

  if (!session) {
    throw new UnauthorizedError('Invalid or expired session.');
  }

  prisma.userSession
    .update({
      where: { id: session.session.id },
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
      where: { id: session.session.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => undefined);

  return {
    sessionId: session.session.id,
    userId: session.user.id,
    workspaceId: session.currentMembership.workspaceId,
    role: session.currentMembership.role,
  };
}

export async function logoutDashboardSession(sessionId: string) {
  await prisma.userSession.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  });
}

export async function requestDashboardPasswordReset(
  input: PasswordResetRequestInput,
): Promise<PasswordResetRequestResponse> {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      disabledAt: true,
      workspaceId: true,
    },
  });

  if (!user || user.disabledAt) {
    return { requested: true };
  }

  const token = await prisma.$transaction((tx) => createPasswordResetToken(tx, user.id));
  await sendPasswordResetEmail({
    email: user.email,
    name: user.name,
    token,
  });

  await emitAuditEvent({
    action: 'auth.password_reset.requested',
    entityType: 'user',
    entityId: user.id,
    actorType: 'user',
    actorId: user.id,
    workspaceId: user.workspaceId,
    metadata: {
      email: user.email,
    },
  }).catch(() => undefined);

  observeAuthEvent('password_reset_requested', 'password');

  return { requested: true };
}

export async function confirmDashboardPasswordReset(
  input: PasswordResetConfirmInput,
): Promise<PasswordResetConfirmResponse> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashOpaqueToken(input.token) },
    include: {
      user: true,
    },
  });

  if (!record || record.usedAt || record.expiresAt <= new Date()) {
    throw new ValidationError('Invalid or expired password reset token.');
  }

  const passwordHash = await hashPassword(input.password);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: record.userId },
      data: {
        passwordHash,
      },
    });

    await tx.passwordResetToken.update({
      where: { id: record.id },
      data: {
        usedAt: new Date(),
      },
    });

    await tx.userSession.updateMany({
      where: {
        userId: record.userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  });

  await emitAuditEvent({
    action: 'auth.password_reset.completed',
    entityType: 'user',
    entityId: record.userId,
    actorType: 'user',
    actorId: record.userId,
    workspaceId: record.user.workspaceId,
    metadata: {
      email: record.user.email,
    },
  });

  observeAuthEvent('password_reset_completed', 'password');

  return { reset: true };
}

export async function requestDashboardEmailVerification(
  userId: string,
): Promise<RequestEmailVerificationResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerifiedAt: true,
      workspaceId: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User', userId);
  }

  if (user.emailVerifiedAt) {
    return { requested: true };
  }

  const token = await prisma.$transaction((tx) =>
    createEmailVerificationToken(tx, user.id, user.email),
  );
  await sendVerificationEmail({
    email: user.email,
    name: user.name,
    token,
  });

  await emitAuditEvent({
    action: 'auth.email_verification.requested',
    entityType: 'user',
    entityId: user.id,
    actorType: 'user',
    actorId: user.id,
    workspaceId: user.workspaceId,
    metadata: {
      email: user.email,
    },
  });

  observeAuthEvent('email_verification_requested', 'password');

  return { requested: true };
}

export async function verifyDashboardEmailToken(token: string): Promise<EmailVerificationResponse> {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashOpaqueToken(token) },
    include: {
      user: true,
    },
  });

  if (!record || record.usedAt || record.expiresAt <= new Date()) {
    throw new ValidationError('Invalid or expired email verification token.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: record.userId },
      data: {
        emailVerifiedAt: new Date(),
      },
    });

    await tx.emailVerificationToken.update({
      where: { id: record.id },
      data: {
        usedAt: new Date(),
      },
    });
  });

  await emitAuditEvent({
    action: 'auth.email_verified',
    entityType: 'user',
    entityId: record.userId,
    actorType: 'user',
    actorId: record.userId,
    workspaceId: record.user.workspaceId,
    metadata: {
      email: record.email,
    },
  });

  observeAuthEvent('email_verified', 'password');

  return { verified: true };
}

export async function switchDashboardWorkspace(
  token: string,
  workspaceId: string,
): Promise<WorkspaceSwitchResponse> {
  const lookup = await findSessionByToken(token);

  if (!lookup) {
    throw new UnauthorizedError('Invalid or expired session.');
  }

  const targetMembership = await prisma.workspaceMembership.findUnique({
    where: {
      userId_workspaceId: {
        userId: lookup.user.id,
        workspaceId,
      },
    },
    include: {
      workspace: true,
    },
  });

  if (!targetMembership || targetMembership.disabledAt) {
    throw new UnauthorizedError('You do not have active access to the selected workspace.');
  }

  await prisma.userSession.update({
    where: { id: lookup.session.id },
    data: {
      workspaceId,
      lastUsedAt: new Date(),
    },
  });

  const refreshed = await getCurrentDashboardSession(token);
  return { session: refreshed };
}

export async function acceptWorkspaceInvite(
  input: AcceptWorkspaceInviteInput,
): Promise<AuthSuccessResponse> {
  const invite = await prisma.workspaceInvite.findUnique({
    where: {
      tokenHash: hashOpaqueToken(input.token),
    },
    include: {
      workspace: true,
    },
  });

  if (!invite || invite.revokedAt || invite.acceptedAt || invite.expiresAt <= new Date()) {
    throw new ValidationError('Invalid or expired workspace invite.');
  }

  const email = normalizeEmail(invite.email);
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    let user = existingUser;

    if (!user) {
      if (!input.name || !input.password) {
        throw new ValidationError(
          'Name and password are required when accepting an invite for a new account.',
        );
      }

      user = await tx.user.create({
        data: {
          email,
          name: input.name.trim(),
          passwordHash: await hashPassword(input.password),
          role: invite.role,
          workspaceId: invite.workspaceId,
          emailVerifiedAt: now,
        },
      });
    } else {
      await tx.user.update({
        where: { id: user.id },
        data: {
          emailVerifiedAt: user.emailVerifiedAt ?? now,
        },
      });
    }

    await tx.workspaceMembership.upsert({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId: invite.workspaceId,
        },
      },
      update: {
        role: invite.role,
        disabledAt: null,
        joinedAt: now,
      },
      create: {
        userId: user.id,
        workspaceId: invite.workspaceId,
        role: invite.role,
        joinedAt: now,
      },
    });

    await tx.workspaceInvite.update({
      where: { id: invite.id },
      data: {
        acceptedAt: now,
      },
    });

    const createdSession = await createSession(tx, user.id, invite.workspaceId);
    const refreshedUser = await tx.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    const membership = await tx.workspaceMembership.findUniqueOrThrow({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId: invite.workspaceId,
        },
      },
      include: {
        workspace: true,
      },
    });

    return {
      user: refreshedUser,
      membership,
      session: createdSession.session,
      token: createdSession.token,
    };
  });

  const memberships = await listMembershipRecords(result.user.id, result.user.workspaceId);

  await emitAuditEvent({
    action: 'workspace.invite.accepted',
    entityType: 'workspace_invite',
    entityId: invite.id,
    actorType: 'user',
    actorId: result.user.id,
    workspaceId: invite.workspaceId,
    metadata: {
      email,
      role: invite.role,
    },
  });

  return buildAuthSuccessResponse({
    user: toAuthenticatedUser(result.user, result.membership.role, result.membership.workspaceId),
    workspace: toAuthenticatedWorkspace(result.membership.workspace),
    session: result.session,
    token: result.token,
    availableWorkspaces: memberships.map((membership) =>
      serializeAvailableWorkspace(membership, result.user.workspaceId),
    ),
  });
}
