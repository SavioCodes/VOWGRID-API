import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const seedIds = {
  workspaceId: 'cmg0000000000000000000001',
  agentId: 'cmg0000000000000000000002',
  reviewerId: 'cmg0000000000000000000003',
  connectorId: 'cmg0000000000000000000004',
  slackConnectorId: 'cmg0000000000000000000005',
  policyThresholdId: 'cmg0000000000000000000006',
  policyDeleteGuardId: 'cmg0000000000000000000007',
};

const localApiKey = 'vowgrid_local_dev_key';

function hashApiKey(key: string, salt: string) {
  return createHash('sha256').update(`${salt}:${key}`).digest('hex');
}

async function main() {
  const salt = process.env.API_KEY_SALT;

  if (!salt) {
    throw new Error('API_KEY_SALT is required to seed a local API key.');
  }

  await prisma.workspace.upsert({
    where: { slug: 'primary-trust-workspace' },
    update: {
      name: 'Primary Trust Workspace',
    },
    create: {
      id: seedIds.workspaceId,
      name: 'Primary Trust Workspace',
      slug: 'primary-trust-workspace',
    },
  });

  await prisma.user.upsert({
    where: { email: 'reviewer@vowgrid.local' },
    update: {
      name: 'Local Reviewer',
      role: 'admin',
      workspaceId: seedIds.workspaceId,
    },
    create: {
      id: seedIds.reviewerId,
      email: 'reviewer@vowgrid.local',
      name: 'Local Reviewer',
      role: 'admin',
      workspaceId: seedIds.workspaceId,
    },
  });

  await prisma.agent.upsert({
    where: { id: seedIds.agentId },
    update: {
      name: 'Risk Copilot',
      description: 'Local development agent for integration verification.',
      type: 'external',
      workspaceId: seedIds.workspaceId,
      metadata: {
        source: 'local-seed',
        purpose: 'integration-verification',
      },
    },
    create: {
      id: seedIds.agentId,
      name: 'Risk Copilot',
      description: 'Local development agent for integration verification.',
      type: 'external',
      workspaceId: seedIds.workspaceId,
      metadata: {
        source: 'local-seed',
        purpose: 'integration-verification',
      },
    },
  });

  await prisma.connector.upsert({
    where: { id: seedIds.connectorId },
    update: {
      name: 'Mock Control Connector',
      type: 'mock',
      description: 'Deterministic connector for local end-to-end verification.',
      rollbackSupport: 'supported',
      workspaceId: seedIds.workspaceId,
      enabled: true,
      config: {
        source: 'local-seed',
      },
    },
    create: {
      id: seedIds.connectorId,
      name: 'Mock Control Connector',
      type: 'mock',
      description: 'Deterministic connector for local end-to-end verification.',
      rollbackSupport: 'supported',
      workspaceId: seedIds.workspaceId,
      enabled: true,
      config: {
        source: 'local-seed',
      },
    },
  });

  await prisma.connector.upsert({
    where: { id: seedIds.slackConnectorId },
    update: {
      name: 'Slack Operations',
      type: 'slack',
      description: 'Local placeholder for Slack connector visibility.',
      rollbackSupport: 'partial',
      workspaceId: seedIds.workspaceId,
      enabled: true,
      config: {
        webhookUrl: 'https://example.test/webhook',
      },
    },
    create: {
      id: seedIds.slackConnectorId,
      name: 'Slack Operations',
      type: 'slack',
      description: 'Local placeholder for Slack connector visibility.',
      rollbackSupport: 'partial',
      workspaceId: seedIds.workspaceId,
      enabled: true,
      config: {
        webhookUrl: 'https://example.test/webhook',
      },
    },
  });

  await prisma.policy.upsert({
    where: { id: seedIds.policyThresholdId },
    update: {
      name: 'Production finance threshold',
      description: 'Amounts above 25000 require approval.',
      type: 'amount_threshold',
      rules: {
        amountField: 'amount',
        requireApprovalAbove: 25000,
      },
      priority: 100,
      enabled: true,
      workspaceId: seedIds.workspaceId,
    },
    create: {
      id: seedIds.policyThresholdId,
      name: 'Production finance threshold',
      description: 'Amounts above 25000 require approval.',
      type: 'amount_threshold',
      rules: {
        amountField: 'amount',
        requireApprovalAbove: 25000,
      },
      priority: 100,
      enabled: true,
      workspaceId: seedIds.workspaceId,
    },
  });

  await prisma.policy.upsert({
    where: { id: seedIds.policyDeleteGuardId },
    update: {
      name: 'Delete action guardrail',
      description: 'Blocks destructive delete actions during local verification.',
      type: 'action_restriction',
      rules: {
        blockedActions: ['delete_message'],
      },
      priority: 90,
      enabled: true,
      workspaceId: seedIds.workspaceId,
    },
    create: {
      id: seedIds.policyDeleteGuardId,
      name: 'Delete action guardrail',
      description: 'Blocks destructive delete actions during local verification.',
      type: 'action_restriction',
      rules: {
        blockedActions: ['delete_message'],
      },
      priority: 90,
      enabled: true,
      workspaceId: seedIds.workspaceId,
    },
  });

  const keyHash = hashApiKey(localApiKey, salt);

  await prisma.apiKey.upsert({
    where: { keyHash },
    update: {
      name: 'Local Development Key',
      keyPrefix: localApiKey.slice(0, 8),
      workspaceId: seedIds.workspaceId,
      scopes: ['*'],
      revokedAt: null,
    },
    create: {
      name: 'Local Development Key',
      keyHash,
      keyPrefix: localApiKey.slice(0, 8),
      workspaceId: seedIds.workspaceId,
      scopes: ['*'],
    },
  });

  console.log('Seed complete.');
  console.log(`Workspace ID: ${seedIds.workspaceId}`);
  console.log(`Agent ID: ${seedIds.agentId}`);
  console.log(`Reviewer ID: ${seedIds.reviewerId}`);
  console.log(`Mock connector ID: ${seedIds.connectorId}`);
  console.log(`API key: ${localApiKey}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
