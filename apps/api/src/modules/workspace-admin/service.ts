import type {
  AnonymizeWorkspaceMemberResponse,
  CreateWorkspaceApiKeyInput,
  CreateWorkspaceInviteInput,
  CreateWorkspaceMemberInput,
  RevokeWorkspaceApiKeyResponse,
  RevokeWorkspaceInviteResponse,
  UpdateWorkspaceMemberInput,
  WorkspaceApiKeyResponse,
  WorkspaceApiKeySecretResponse,
  WorkspaceExportResponse,
  WorkspaceInviteResponse,
  WorkspaceInviteSecretResponse,
  WorkspaceMemberMutationResponse,
  WorkspaceMemberResponse,
} from '@vowgrid/contracts';
import { buildApiKeyPrefix, generateApiKeySecret, hashApiKey } from '../../common/api-keys.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../common/errors.js';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { emitAuditEvent } from '../audits/service.js';
import { assertCanManageInternalUsers } from '../billing/entitlements.js';
import { hashPassword, generateOpaqueToken, hashOpaqueToken } from '../auth/security.js';
import { sendAuthEmail } from '../auth/mailer.js';

const MEMBER_ROLE_ORDER = ['owner', 'admin', 'member', 'viewer'] as const;
const INVITE_TTL_DAYS = 7;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function buildInviteUrl(token: string) {
  return new URL(
    `/accept-invite?token=${encodeURIComponent(token)}`,
    env.APP_WEB_BASE_URL,
  ).toString();
}

function toPlainRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function resolveMemberStatus(record: {
  disabledAt: Date | null;
}): WorkspaceMemberResponse['status'] {
  return record.disabledAt ? 'disabled' : 'active';
}

function serializeWorkspaceMember(record: {
  user: {
    id: string;
    email: string;
    name: string;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  role: string;
  disabledAt: Date | null;
}): WorkspaceMemberResponse {
  return {
    id: record.user.id,
    email: record.user.email,
    name: record.user.name,
    role: record.role as WorkspaceMemberResponse['role'],
    status: resolveMemberStatus(record),
    lastLoginAt: record.user.lastLoginAt?.toISOString() ?? null,
    disabledAt: record.disabledAt?.toISOString() ?? null,
    createdAt: record.user.createdAt.toISOString(),
    updatedAt: record.user.updatedAt.toISOString(),
  };
}

function resolveInviteStatus(record: {
  acceptedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
}): WorkspaceInviteResponse['status'] {
  if (record.revokedAt) {
    return 'revoked';
  }

  if (record.acceptedAt) {
    return 'accepted';
  }

  if (record.expiresAt <= new Date()) {
    return 'expired';
  }

  return 'pending';
}

function serializeWorkspaceInvite(record: {
  id: string;
  email: string;
  role: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}): WorkspaceInviteResponse {
  return {
    id: record.id,
    email: record.email,
    role: record.role as WorkspaceInviteResponse['role'],
    status: resolveInviteStatus(record),
    expiresAt: record.expiresAt.toISOString(),
    acceptedAt: record.acceptedAt?.toISOString() ?? null,
    revokedAt: record.revokedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
  };
}

function resolveApiKeyStatus(record: {
  revokedAt: Date | null;
  expiresAt: Date | null;
}): WorkspaceApiKeyResponse['status'] {
  if (record.revokedAt) {
    return 'revoked';
  }

  if (record.expiresAt && record.expiresAt <= new Date()) {
    return 'expired';
  }

  return 'active';
}

function serializeApiKey(record: {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
}): WorkspaceApiKeyResponse {
  return {
    id: record.id,
    name: record.name,
    keyPrefix: record.keyPrefix,
    scopes: record.scopes,
    status: resolveApiKeyStatus(record),
    expiresAt: record.expiresAt?.toISOString() ?? null,
    lastUsedAt: record.lastUsedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    revokedAt: record.revokedAt?.toISOString() ?? null,
  };
}

function parseOptionalExpiry(expiresAt?: string | null) {
  if (!expiresAt) {
    return null;
  }

  const parsed = new Date(expiresAt);

  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError('API key expiry must be a valid ISO datetime.');
  }

  if (parsed <= new Date()) {
    throw new ValidationError('API key expiry must be in the future.');
  }

  return parsed;
}

async function getWorkspaceMembershipOrThrow(userId: string, workspaceId: string) {
  const membership = await prisma.workspaceMembership.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
    include: {
      user: true,
      workspace: true,
    },
  });

  if (!membership) {
    throw new NotFoundError('WorkspaceMembership', `${workspaceId}:${userId}`);
  }

  return membership;
}

async function getWorkspaceApiKeyOrThrow(apiKeyId: string, workspaceId: string) {
  const record = await prisma.apiKey.findFirst({
    where: {
      id: apiKeyId,
      workspaceId,
    },
  });

  if (!record) {
    throw new NotFoundError('ApiKey', apiKeyId);
  }

  return record;
}

async function getWorkspaceInviteOrThrow(inviteId: string, workspaceId: string) {
  const record = await prisma.workspaceInvite.findFirst({
    where: {
      id: inviteId,
      workspaceId,
    },
  });

  if (!record) {
    throw new NotFoundError('WorkspaceInvite', inviteId);
  }

  return record;
}

function assertMemberCanBeDisabled(member: { role: string; userId: string }, actorId: string) {
  if (member.role === 'owner') {
    throw new ForbiddenError('Workspace owners cannot be disabled from this admin surface.');
  }

  if (member.userId === actorId) {
    throw new ForbiddenError('You cannot disable your own account from this admin surface.');
  }
}

function assertMemberCanBeAnonymized(member: {
  role: string;
  disabledAt: Date | null;
  user: { email: string };
}) {
  if (member.role === 'owner') {
    throw new ForbiddenError('Workspace owners cannot be anonymized from this admin surface.');
  }

  if (!member.disabledAt) {
    throw new ForbiddenError(
      'Disable the workspace member before anonymizing personally identifiable data.',
    );
  }

  if (member.user.email.endsWith('@redacted.vowgrid.invalid')) {
    throw new ConflictError('This workspace member has already been anonymized.');
  }
}

async function realignUserDefaultWorkspace(userId: string, disabledWorkspaceId: string) {
  const nextMembership = await prisma.workspaceMembership.findFirst({
    where: {
      userId,
      disabledAt: null,
      workspaceId: {
        not: disabledWorkspaceId,
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  if (!nextMembership) {
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      workspaceId: nextMembership.workspaceId,
      role: nextMembership.role,
    },
  });
}

async function assertWorkspaceMembershipDoesNotExist(email: string, workspaceId: string) {
  const existing = await prisma.workspaceMembership.findFirst({
    where: {
      workspaceId,
      user: {
        email,
      },
    },
    select: {
      userId: true,
    },
  });

  if (existing) {
    throw new ConflictError('That user already belongs to this workspace.');
  }
}

export async function listWorkspaceMembers(
  workspaceId: string,
): Promise<WorkspaceMemberResponse[]> {
  const members = await prisma.workspaceMembership.findMany({
    where: { workspaceId },
    include: {
      user: true,
    },
  });

  return members
    .sort((left, right) => {
      const leftDisabled = left.disabledAt ? 1 : 0;
      const rightDisabled = right.disabledAt ? 1 : 0;

      if (leftDisabled !== rightDisabled) {
        return leftDisabled - rightDisabled;
      }

      const leftRole = MEMBER_ROLE_ORDER.indexOf(left.role as (typeof MEMBER_ROLE_ORDER)[number]);
      const rightRole = MEMBER_ROLE_ORDER.indexOf(right.role as (typeof MEMBER_ROLE_ORDER)[number]);

      if (leftRole !== rightRole) {
        return leftRole - rightRole;
      }

      return left.user.name.localeCompare(right.user.name);
    })
    .map(serializeWorkspaceMember);
}

export async function createWorkspaceMember(
  workspaceId: string,
  input: CreateWorkspaceMemberInput,
  actorId: string,
): Promise<WorkspaceMemberMutationResponse> {
  await assertCanManageInternalUsers(workspaceId);

  const email = normalizeEmail(input.email);
  await assertWorkspaceMembershipDoesNotExist(email, workspaceId);

  const passwordHash = await hashPassword(input.password);
  const now = new Date();

  const membership = await prisma.$transaction(async (tx) => {
    let user = await tx.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await tx.user.create({
        data: {
          workspaceId,
          email,
          name: input.name.trim(),
          role: input.role,
          passwordHash,
        },
      });
    } else if (!user.passwordHash) {
      user = await tx.user.update({
        where: { id: user.id },
        data: {
          name: input.name.trim(),
          passwordHash,
        },
      });
    } else if (user.workspaceId === workspaceId) {
      await tx.user.update({
        where: { id: user.id },
        data: {
          name: input.name.trim(),
          role: input.role,
        },
      });
    }

    return tx.workspaceMembership.create({
      data: {
        userId: user.id,
        workspaceId,
        role: input.role,
        joinedAt: now,
      },
      include: {
        user: true,
      },
    });
  });

  await emitAuditEvent({
    action: 'workspace.member.created',
    entityType: 'user',
    entityId: membership.user.id,
    actorType: 'user',
    actorId,
    workspaceId,
    metadata: {
      email: membership.user.email,
      role: membership.role,
    },
  });

  return {
    member: serializeWorkspaceMember(membership),
  };
}

export async function updateWorkspaceMember(
  userId: string,
  workspaceId: string,
  input: UpdateWorkspaceMemberInput,
  actorId: string,
): Promise<WorkspaceMemberMutationResponse> {
  const existing = await getWorkspaceMembershipOrThrow(userId, workspaceId);

  if (existing.role === 'owner' && input.role !== undefined) {
    throw new ForbiddenError('Workspace owner role cannot be changed from this admin surface.');
  }

  const member = await prisma.$transaction(async (tx) => {
    if (input.name !== undefined) {
      await tx.user.update({
        where: { id: existing.userId },
        data: {
          name: input.name.trim(),
        },
      });
    }

    if (input.role !== undefined) {
      await tx.workspaceMembership.update({
        where: {
          userId_workspaceId: {
            userId,
            workspaceId,
          },
        },
        data: {
          role: input.role,
        },
      });

      const user = await tx.user.findUnique({
        where: { id: existing.userId },
        select: { workspaceId: true },
      });

      if (user?.workspaceId === workspaceId) {
        await tx.user.update({
          where: { id: existing.userId },
          data: {
            role: input.role,
          },
        });
      }
    }

    return tx.workspaceMembership.findUniqueOrThrow({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
      include: {
        user: true,
      },
    });
  });

  await emitAuditEvent({
    action: 'workspace.member.updated',
    entityType: 'user',
    entityId: member.user.id,
    actorType: 'user',
    actorId,
    workspaceId,
    metadata: {
      previousRole: existing.role,
      nextRole: member.role,
      disabledAt: member.disabledAt?.toISOString() ?? null,
    },
  });

  return {
    member: serializeWorkspaceMember(member),
  };
}

export async function disableWorkspaceMember(
  userId: string,
  workspaceId: string,
  actorId: string,
): Promise<WorkspaceMemberMutationResponse> {
  const existing = await getWorkspaceMembershipOrThrow(userId, workspaceId);
  assertMemberCanBeDisabled(existing, actorId);

  if (existing.disabledAt) {
    return {
      member: serializeWorkspaceMember(existing),
    };
  }

  const now = new Date();
  const member = await prisma.$transaction(async (tx) => {
    const updated = await tx.workspaceMembership.update({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
      data: {
        disabledAt: now,
      },
      include: {
        user: true,
      },
    });

    await tx.userSession.updateMany({
      where: {
        userId,
        workspaceId,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    });

    return updated;
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      workspaceId: true,
    },
  });

  if (user?.workspaceId === workspaceId) {
    await realignUserDefaultWorkspace(userId, workspaceId);
  }

  await emitAuditEvent({
    action: 'workspace.member.disabled',
    entityType: 'user',
    entityId: member.user.id,
    actorType: 'user',
    actorId,
    workspaceId,
    metadata: {
      email: member.user.email,
      role: member.role,
    },
  });

  return {
    member: serializeWorkspaceMember(member),
  };
}

export async function enableWorkspaceMember(
  userId: string,
  workspaceId: string,
  actorId: string,
): Promise<WorkspaceMemberMutationResponse> {
  const existing = await getWorkspaceMembershipOrThrow(userId, workspaceId);

  if (!existing.disabledAt) {
    return {
      member: serializeWorkspaceMember(existing),
    };
  }

  await assertCanManageInternalUsers(workspaceId);

  const member = await prisma.workspaceMembership.update({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
    data: {
      disabledAt: null,
    },
    include: {
      user: true,
    },
  });

  await emitAuditEvent({
    action: 'workspace.member.enabled',
    entityType: 'user',
    entityId: member.user.id,
    actorType: 'user',
    actorId,
    workspaceId,
    metadata: {
      email: member.user.email,
      role: member.role,
    },
  });

  return {
    member: serializeWorkspaceMember(member),
  };
}

export async function listWorkspaceInvites(
  workspaceId: string,
): Promise<WorkspaceInviteResponse[]> {
  const invites = await prisma.workspaceInvite.findMany({
    where: { workspaceId },
    orderBy: [{ revokedAt: 'asc' }, { createdAt: 'desc' }],
  });

  return invites.map(serializeWorkspaceInvite);
}

export async function createWorkspaceInvite(
  workspaceId: string,
  input: CreateWorkspaceInviteInput,
  actorId: string,
): Promise<WorkspaceInviteSecretResponse> {
  const email = normalizeEmail(input.email);
  await assertWorkspaceMembershipDoesNotExist(email, workspaceId);

  const existingInvite = await prisma.workspaceInvite.findFirst({
    where: {
      workspaceId,
      email,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (existingInvite) {
    throw new ConflictError('An active invite already exists for this email.');
  }

  const inviteToken = generateOpaqueToken();
  const invite = await prisma.workspaceInvite.create({
    data: {
      workspaceId,
      email,
      role: input.role,
      tokenHash: hashOpaqueToken(inviteToken),
      invitedByUserId: actorId,
      expiresAt: addDays(new Date(), INVITE_TTL_DAYS),
    },
  });

  const inviteUrl = buildInviteUrl(inviteToken);
  await sendAuthEmail({
    to: invite.email,
    subject: 'You were invited to a VowGrid workspace',
    text: `You were invited to a VowGrid workspace. Accept the invite here: ${inviteUrl}`,
    html: `<p>You were invited to a VowGrid workspace.</p><p>Accept the invite here: <a href="${inviteUrl}">${inviteUrl}</a></p>`,
  });

  await emitAuditEvent({
    action: 'workspace.invite.created',
    entityType: 'workspace_invite',
    entityId: invite.id,
    actorType: 'user',
    actorId,
    workspaceId,
    metadata: {
      email: invite.email,
      role: invite.role,
    },
  });

  return {
    inviteToken,
    inviteUrl,
    invite: serializeWorkspaceInvite(invite),
  };
}

export async function revokeWorkspaceInvite(
  inviteId: string,
  workspaceId: string,
  actorId: string,
): Promise<RevokeWorkspaceInviteResponse> {
  const existing = await getWorkspaceInviteOrThrow(inviteId, workspaceId);

  if (existing.revokedAt) {
    return {
      revoked: true,
      invite: serializeWorkspaceInvite(existing),
    };
  }

  const invite = await prisma.workspaceInvite.update({
    where: { id: existing.id },
    data: {
      revokedAt: new Date(),
    },
  });

  await emitAuditEvent({
    action: 'workspace.invite.revoked',
    entityType: 'workspace_invite',
    entityId: invite.id,
    actorType: 'user',
    actorId,
    workspaceId,
    metadata: {
      email: invite.email,
      role: invite.role,
    },
  });

  return {
    revoked: true,
    invite: serializeWorkspaceInvite(invite),
  };
}

export async function listWorkspaceApiKeys(
  workspaceId: string,
): Promise<WorkspaceApiKeyResponse[]> {
  const records = await prisma.apiKey.findMany({
    where: { workspaceId },
    orderBy: [{ revokedAt: 'asc' }, { createdAt: 'desc' }],
  });

  return records.map(serializeApiKey);
}

export async function createWorkspaceApiKey(
  workspaceId: string,
  input: CreateWorkspaceApiKeyInput,
  actorId: string,
): Promise<WorkspaceApiKeySecretResponse> {
  const secret = generateApiKeySecret();
  const record = await prisma.apiKey.create({
    data: {
      name: input.name.trim(),
      keyHash: hashApiKey(secret),
      keyPrefix: buildApiKeyPrefix(secret),
      workspaceId,
      scopes: ['*'],
      expiresAt: parseOptionalExpiry(input.expiresAt),
    },
  });

  await emitAuditEvent({
    action: 'workspace.api_key.created',
    entityType: 'api_key',
    entityId: record.id,
    actorType: 'user',
    actorId,
    workspaceId,
    metadata: {
      keyPrefix: record.keyPrefix,
      expiresAt: record.expiresAt?.toISOString() ?? null,
    },
  });

  return {
    apiKey: secret,
    record: serializeApiKey(record),
  };
}

export async function revokeWorkspaceApiKey(
  apiKeyId: string,
  workspaceId: string,
  actorId: string,
): Promise<RevokeWorkspaceApiKeyResponse> {
  const existing = await getWorkspaceApiKeyOrThrow(apiKeyId, workspaceId);

  if (existing.revokedAt) {
    return {
      revoked: true,
      record: serializeApiKey(existing),
    };
  }

  const record = await prisma.apiKey.update({
    where: { id: existing.id },
    data: {
      revokedAt: new Date(),
    },
  });

  await emitAuditEvent({
    action: 'workspace.api_key.revoked',
    entityType: 'api_key',
    entityId: record.id,
    actorType: 'user',
    actorId,
    workspaceId,
    metadata: {
      keyPrefix: record.keyPrefix,
    },
  });

  return {
    revoked: true,
    record: serializeApiKey(record),
  };
}

export async function rotateWorkspaceApiKey(
  apiKeyId: string,
  workspaceId: string,
  actorId: string,
): Promise<WorkspaceApiKeySecretResponse> {
  const existing = await getWorkspaceApiKeyOrThrow(apiKeyId, workspaceId);

  if (existing.revokedAt) {
    throw new ConflictError('Revoked API keys cannot be rotated.');
  }

  const secret = generateApiKeySecret();
  const now = new Date();

  const rotated = await prisma.$transaction(async (tx) => {
    await tx.apiKey.update({
      where: { id: existing.id },
      data: { revokedAt: now },
    });

    return tx.apiKey.create({
      data: {
        name: existing.name,
        keyHash: hashApiKey(secret),
        keyPrefix: buildApiKeyPrefix(secret),
        workspaceId,
        scopes: existing.scopes,
        expiresAt: existing.expiresAt,
      },
    });
  });

  await emitAuditEvent({
    action: 'workspace.api_key.rotated',
    entityType: 'api_key',
    entityId: rotated.id,
    actorType: 'user',
    actorId,
    workspaceId,
    metadata: {
      previousApiKeyId: existing.id,
      previousKeyPrefix: existing.keyPrefix,
      newKeyPrefix: rotated.keyPrefix,
    },
  });

  return {
    apiKey: secret,
    record: serializeApiKey(rotated),
  };
}

export async function anonymizeWorkspaceMember(
  userId: string,
  workspaceId: string,
  actorId: string,
): Promise<AnonymizeWorkspaceMemberResponse> {
  const existing = await getWorkspaceMembershipOrThrow(userId, workspaceId);
  assertMemberCanBeAnonymized(existing);

  const anonymizedEmail = `anonymized+${existing.user.id}@redacted.vowgrid.invalid`;
  const anonymizedName = `Anonymized user ${existing.user.id.slice(-6)}`;
  const now = new Date();

  const member = await prisma.$transaction(async (tx) => {
    await tx.userSession.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    });

    await tx.passwordResetToken.updateMany({
      where: {
        userId,
        usedAt: null,
      },
      data: {
        usedAt: now,
      },
    });

    await tx.emailVerificationToken.updateMany({
      where: {
        userId,
        usedAt: null,
      },
      data: {
        usedAt: now,
      },
    });

    await tx.oAuthAccount.deleteMany({
      where: {
        userId,
      },
    });

    await tx.workspaceInvite.updateMany({
      where: {
        email: existing.user.email,
        revokedAt: null,
        acceptedAt: null,
      },
      data: {
        revokedAt: now,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        email: anonymizedEmail,
        name: anonymizedName,
        passwordHash: null,
        emailVerifiedAt: null,
        lastLoginAt: null,
      },
    });

    return tx.workspaceMembership.findUniqueOrThrow({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
      include: {
        user: true,
      },
    });
  });

  await emitAuditEvent({
    action: 'workspace.member.anonymized',
    entityType: 'user',
    entityId: member.user.id,
    actorType: 'user',
    actorId,
    workspaceId,
    metadata: {
      previousEmail: existing.user.email,
      anonymizedEmail,
    },
  });

  return {
    anonymized: true,
    member: serializeWorkspaceMember(member),
  };
}

export async function exportWorkspaceData(workspaceId: string): Promise<WorkspaceExportResponse> {
  const [workspace, receipts] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      include: {
        billingCustomer: true,
        subscription: true,
        billingInvoices: {
          orderBy: { createdAt: 'desc' },
        },
        memberships: {
          include: {
            user: true,
          },
        },
        invites: {
          orderBy: [{ revokedAt: 'asc' }, { createdAt: 'desc' }],
        },
        apiKeys: {
          orderBy: [{ revokedAt: 'asc' }, { createdAt: 'desc' }],
        },
        agents: {
          orderBy: { createdAt: 'asc' },
        },
        connectors: {
          orderBy: { createdAt: 'asc' },
        },
        policies: {
          orderBy: [{ enabled: 'desc' }, { priority: 'desc' }, { createdAt: 'asc' }],
        },
        intents: {
          orderBy: { createdAt: 'desc' },
        },
        auditEvents: {
          orderBy: { createdAt: 'desc' },
          take: 500,
        },
      },
    }),
    prisma.receipt.findMany({
      where: {
        intent: {
          workspaceId,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
    },
    billing: {
      customer: workspace.billingCustomer
        ? {
            id: workspace.billingCustomer.id,
            email: workspace.billingCustomer.email,
            legalName: workspace.billingCustomer.legalName,
            createdAt: workspace.billingCustomer.createdAt.toISOString(),
            updatedAt: workspace.billingCustomer.updatedAt.toISOString(),
          }
        : null,
      subscription: workspace.subscription
        ? {
            id: workspace.subscription.id,
            provider: workspace.subscription.provider,
            planKey: workspace.subscription.planKey,
            billingCycle: workspace.subscription.billingCycle,
            status: workspace.subscription.status,
            currentPeriodStart: workspace.subscription.currentPeriodStart?.toISOString() ?? null,
            currentPeriodEnd: workspace.subscription.currentPeriodEnd?.toISOString() ?? null,
            createdAt: workspace.subscription.createdAt.toISOString(),
            updatedAt: workspace.subscription.updatedAt.toISOString(),
          }
        : null,
      invoices: workspace.billingInvoices.map((invoice) => ({
        id: invoice.id,
        status: invoice.status,
        subtotalBrlCents: invoice.subtotalBrlCents,
        taxRateBps: invoice.taxRateBps,
        taxAmountBrlCents: invoice.taxAmountBrlCents,
        totalBrlCents: invoice.totalBrlCents,
        issuedAt: invoice.issuedAt?.toISOString() ?? null,
        paidAt: invoice.paidAt?.toISOString() ?? null,
        createdAt: invoice.createdAt.toISOString(),
        updatedAt: invoice.updatedAt.toISOString(),
      })),
    },
    members: workspace.memberships
      .sort((left, right) => left.user.name.localeCompare(right.user.name))
      .map(serializeWorkspaceMember),
    invites: workspace.invites.map(serializeWorkspaceInvite),
    apiKeys: workspace.apiKeys.map(serializeApiKey),
    agents: workspace.agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      type: agent.type,
      metadata: toPlainRecord(agent.metadata),
      createdAt: agent.createdAt.toISOString(),
      updatedAt: agent.updatedAt.toISOString(),
    })),
    connectors: workspace.connectors.map((connector) => ({
      id: connector.id,
      name: connector.name,
      type: connector.type,
      description: connector.description,
      enabled: connector.enabled,
      rollbackSupport: connector.rollbackSupport,
      config: toPlainRecord(connector.config),
      createdAt: connector.createdAt.toISOString(),
      updatedAt: connector.updatedAt.toISOString(),
    })),
    policies: workspace.policies.map((policy) => ({
      id: policy.id,
      name: policy.name,
      description: policy.description,
      type: policy.type,
      priority: policy.priority,
      enabled: policy.enabled,
      rules: toPlainRecord(policy.rules) ?? {},
      createdAt: policy.createdAt.toISOString(),
      updatedAt: policy.updatedAt.toISOString(),
    })),
    intents: workspace.intents.map((intent) => ({
      id: intent.id,
      title: intent.title,
      description: intent.description,
      action: intent.action,
      status: intent.status,
      environment: intent.environment,
      agentId: intent.agentId,
      connectorId: intent.connectorId,
      parameters: toPlainRecord(intent.parameters),
      createdAt: intent.createdAt.toISOString(),
      updatedAt: intent.updatedAt.toISOString(),
    })),
    receipts: receipts.map((receipt) => ({
      id: receipt.id,
      intentId: receipt.intentId,
      type: receipt.type,
      summary: receipt.summary,
      duration: receipt.duration,
      createdAt: receipt.createdAt.toISOString(),
    })),
    auditEvents: workspace.auditEvents.map((event) => ({
      id: event.id,
      action: event.action,
      actorType: event.actorType,
      actorId: event.actorId,
      entityType: event.entityType,
      entityId: event.entityId,
      metadata: toPlainRecord(event.metadata),
      createdAt: event.createdAt.toISOString(),
    })),
  };
}
