import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectorRegistry } from '../../apps/api/src/modules/connectors/framework/connector.registry.js';
import { MockConnector } from '../../apps/api/src/modules/connectors/framework/mock.connector.js';
import { buildServer } from '../../apps/api/src/server.js';
import { prisma } from '../../apps/api/src/lib/prisma.js';

describe('workspace API key management integration', () => {
  const createdWorkspaceIds: string[] = [];
  let app: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    if (!connectorRegistry.has('mock')) {
      connectorRegistry.register('mock', new MockConnector());
    }

    await prisma.$connect();
    app = await buildServer();
  });

  afterAll(async () => {
    if (createdWorkspaceIds.length > 0) {
      await prisma.workspace.deleteMany({
        where: {
          id: {
            in: createdWorkspaceIds,
          },
        },
      });
    }

    await app.close();
    await prisma.$disconnect();
  });

  it('creates, rotates, lists, and revokes workspace API keys through authenticated routes', async () => {
    const uniqueId = Date.now().toString();
    const signup = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        workspaceName: `Integration Workspace ${uniqueId}`,
        name: 'Integration Owner',
        email: `integration-${uniqueId}@vowgrid.local`,
        password: 'integration_password_123',
      },
    });

    expect(signup.statusCode).toBe(201);
    const signupBody = signup.json();
    expect(signupBody.success).toBe(true);

    const token = signupBody.data.session.token as string;
    const workspaceId = signupBody.data.workspace.id as string;
    createdWorkspaceIds.push(workspaceId);

    const createdKey = await app.inject({
      method: 'POST',
      url: '/v1/workspace/api-keys',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      payload: {
        name: 'CI automation',
      },
    });

    expect(createdKey.statusCode).toBe(201);
    const createdBody = createdKey.json();
    expect(createdBody.success).toBe(true);
    expect(createdBody.data.apiKey).toMatch(/^vgk_/);
    expect(createdBody.data.record.keyPrefix).toMatch(/^vgk_/);

    const listBeforeRotate = await app.inject({
      method: 'GET',
      url: '/v1/workspace/api-keys',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(listBeforeRotate.statusCode).toBe(200);
    const listedKeys = listBeforeRotate.json().data as Array<{ id: string; name: string }>;
    expect(listedKeys).toHaveLength(1);
    expect(listedKeys[0]?.name).toBe('CI automation');

    const createdSecret = createdBody.data.apiKey as string;
    const authWithCreatedKey = await app.inject({
      method: 'GET',
      url: '/v1/intents?pageSize=5',
      headers: {
        'X-Api-Key': createdSecret,
      },
    });

    expect(authWithCreatedKey.statusCode).toBe(200);

    const rotatedKey = await app.inject({
      method: 'POST',
      url: `/v1/workspace/api-keys/${listedKeys[0]!.id}/rotate`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      payload: {},
    });

    expect(rotatedKey.statusCode).toBe(200);
    const rotatedBody = rotatedKey.json();
    expect(rotatedBody.success).toBe(true);
    expect(rotatedBody.data.apiKey).toMatch(/^vgk_/);

    const oldKeyAfterRotate = await app.inject({
      method: 'GET',
      url: '/v1/intents?pageSize=5',
      headers: {
        'X-Api-Key': createdSecret,
      },
    });

    expect(oldKeyAfterRotate.statusCode).toBe(401);

    const newKeyAfterRotate = await app.inject({
      method: 'GET',
      url: '/v1/intents?pageSize=5',
      headers: {
        'X-Api-Key': rotatedBody.data.apiKey as string,
      },
    });

    expect(newKeyAfterRotate.statusCode).toBe(200);

    const revokeResponse = await app.inject({
      method: 'POST',
      url: `/v1/workspace/api-keys/${rotatedBody.data.record.id as string}/revoke`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      payload: {},
    });

    expect(revokeResponse.statusCode).toBe(200);
    expect(revokeResponse.json().data.revoked).toBe(true);

    const revokedKeyAuth = await app.inject({
      method: 'GET',
      url: '/v1/intents?pageSize=5',
      headers: {
        'X-Api-Key': rotatedBody.data.apiKey as string,
      },
    });

    expect(revokedKeyAuth.statusCode).toBe(401);
  });
});
