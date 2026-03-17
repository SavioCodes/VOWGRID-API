// ──────────────────────────────────────────
// VowGrid — Policy Service
// ──────────────────────────────────────────

import { prisma } from '../../lib/prisma.js';
import { z } from 'zod';
import { NotFoundError } from '../../common/errors.js';
import { toPrismaJsonValue } from '../../common/json.js';
import { assertCanCreatePolicy } from '../billing/entitlements.js';

export const createPolicySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  type: z.enum([
    'amount_threshold',
    'action_restriction',
    'connector_restriction',
    'environment_restriction',
    'role_constraint',
  ]),
  rules: z.record(z.unknown()),
  priority: z.number().int().min(0).max(1000).default(0),
  enabled: z.boolean().default(true),
});

export type CreatePolicyInput = z.infer<typeof createPolicySchema>;

export async function createPolicy(workspaceId: string, input: CreatePolicyInput) {
  await assertCanCreatePolicy(workspaceId, input.type);

  return prisma.policy.create({
    data: {
      name: input.name,
      description: input.description,
      type: input.type,
      rules: toPrismaJsonValue(input.rules),
      priority: input.priority,
      enabled: input.enabled,
      workspaceId,
    },
  });
}

export async function listPolicies(workspaceId: string) {
  return prisma.policy.findMany({
    where: { workspaceId },
    orderBy: { priority: 'desc' },
  });
}

export async function getPolicy(id: string, workspaceId: string) {
  const policy = await prisma.policy.findFirst({
    where: { id, workspaceId },
  });
  if (!policy) throw new NotFoundError('Policy', id);
  return policy;
}
