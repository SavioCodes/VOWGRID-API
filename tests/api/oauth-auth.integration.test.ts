import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildServer } from '../../apps/api/src/server.js';
import { prisma } from '../../apps/api/src/lib/prisma.js';

describe('oauth auth integration', () => {
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

  it('creates an onboarding token for a new OAuth identity and completes workspace signup', async () => {
    const uniqueId = Date.now().toString();
    const complete = await app.inject({
      method: 'POST',
      url: '/v1/auth/oauth/complete',
      payload: {
        provider: 'github',
        providerAccountId: `gh-${uniqueId}`,
        email: `oauth-new-${uniqueId}@vowgrid.local`,
        name: 'OAuth New User',
      },
    });

    expect(complete.statusCode).toBe(200);
    expect(complete.json().data.kind).toBe('signup_required');

    const token = complete.json().data.candidate.token as string;
    const finish = await app.inject({
      method: 'POST',
      url: '/v1/auth/oauth/signup/complete',
      payload: {
        token,
        workspaceName: `OAuth Workspace ${uniqueId}`,
      },
    });

    expect(finish.statusCode).toBe(201);
    const body = finish.json().data;
    createdWorkspaceIds.push(body.workspace.id as string);
    expect(body.user.emailVerifiedAt).not.toBeNull();
    expect(body.availableWorkspaces).toHaveLength(1);

    const me = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: {
        Authorization: `Bearer ${body.session.token as string}`,
      },
    });

    expect(me.statusCode).toBe(200);
    expect(me.json().data.user.email).toBe(`oauth-new-${uniqueId}@vowgrid.local`);
  });

  it('links an OAuth provider to an existing account and opens a session immediately', async () => {
    const uniqueId = `${Date.now()}-existing`;
    const signup = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        workspaceName: `Existing OAuth ${uniqueId}`,
        name: 'Existing User',
        email: `oauth-existing-${uniqueId}@vowgrid.local`,
        password: 'existing_password_123',
      },
    });

    expect(signup.statusCode).toBe(201);
    createdWorkspaceIds.push(signup.json().data.workspace.id as string);

    const complete = await app.inject({
      method: 'POST',
      url: '/v1/auth/oauth/complete',
      payload: {
        provider: 'google',
        providerAccountId: `google-${uniqueId}`,
        email: `oauth-existing-${uniqueId}@vowgrid.local`,
        name: 'Existing User',
      },
    });

    expect(complete.statusCode).toBe(200);
    expect(complete.json().data.kind).toBe('authenticated');
    expect(complete.json().data.auth.user.email).toBe(`oauth-existing-${uniqueId}@vowgrid.local`);

    const repeated = await app.inject({
      method: 'POST',
      url: '/v1/auth/oauth/complete',
      payload: {
        provider: 'google',
        providerAccountId: `google-${uniqueId}`,
        email: `oauth-existing-${uniqueId}@vowgrid.local`,
        name: 'Existing User',
      },
    });

    expect(repeated.statusCode).toBe(200);
    expect(repeated.json().data.kind).toBe('authenticated');
  });
});
