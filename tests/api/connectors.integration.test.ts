import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildServer } from '../../apps/api/src/server.js';
import { prisma } from '../../apps/api/src/lib/prisma.js';

describe('connector runtime integration', () => {
  const createdWorkspaceIds: string[] = [];
  let app: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
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

  it('lists registered runtime connector types and validates connector config on create', async () => {
    const uniqueId = Date.now().toString();
    const signup = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        workspaceName: `Connector Workspace ${uniqueId}`,
        name: 'Connector Owner',
        email: `connector-owner-${uniqueId}@vowgrid.local`,
        password: 'owner_password_123',
      },
    });

    expect(signup.statusCode).toBe(201);
    const body = signup.json().data;
    createdWorkspaceIds.push(body.workspace.id as string);
    const token = body.session.token as string;

    const list = await app.inject({
      method: 'GET',
      url: '/v1/connectors',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(list.statusCode).toBe(200);
    const registeredTypes = list.json().data.registeredTypes as Array<{ type: string }>;
    expect(registeredTypes.map((item) => item.type)).toEqual(
      expect.arrayContaining(['mock', 'http', 'github']),
    );

    const invalidHttp = await app.inject({
      method: 'POST',
      url: '/v1/connectors',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      payload: {
        name: 'Broken webhook connector',
        type: 'http',
        config: {
          method: 'POST',
        },
      },
    });

    expect(invalidHttp.statusCode).toBe(400);

    const validHttp = await app.inject({
      method: 'POST',
      url: '/v1/connectors',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      payload: {
        name: 'Webhook connector',
        type: 'http',
        config: {
          url: 'https://example.com/webhook',
          rollbackUrl: 'https://example.com/webhook/rollback',
          headers: {
            'X-VowGrid-Test': 'integration',
          },
        },
      },
    });

    expect(validHttp.statusCode).toBe(201);
    expect(validHttp.json().data.type).toBe('http');
    expect(validHttp.json().data.rollbackSupport).toBe('partial');
  });
});
