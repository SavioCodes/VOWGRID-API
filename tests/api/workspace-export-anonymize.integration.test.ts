import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildServer } from '../../apps/api/src/server.js';
import { prisma } from '../../apps/api/src/lib/prisma.js';

describe('workspace export and anonymization integration', () => {
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

  it('exports workspace data and anonymizes disabled members', async () => {
    const uniqueId = Date.now().toString();
    const ownerEmail = `owner-export-${uniqueId}@vowgrid.local`;
    const memberEmail = `member-export-${uniqueId}@vowgrid.local`;

    const signup = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        workspaceName: `Export Workspace ${uniqueId}`,
        name: 'Export Owner',
        email: ownerEmail,
        password: 'owner_password_123',
      },
    });

    expect(signup.statusCode).toBe(201);
    const ownerToken = signup.json().data.session.token as string;
    const workspaceId = signup.json().data.workspace.id as string;
    createdWorkspaceIds.push(workspaceId);

    const createdMember = await app.inject({
      method: 'POST',
      url: '/v1/workspace/members',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
      payload: {
        name: 'Workspace Member',
        email: memberEmail,
        role: 'member',
        password: 'member_password_123',
      },
    });

    expect(createdMember.statusCode).toBe(201);
    const memberId = createdMember.json().data.member.id as string;

    const disabledMember = await app.inject({
      method: 'POST',
      url: `/v1/workspace/members/${memberId}/disable`,
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
      payload: {},
    });

    expect(disabledMember.statusCode).toBe(200);

    const anonymizedMember = await app.inject({
      method: 'POST',
      url: `/v1/workspace/members/${memberId}/anonymize`,
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
      payload: {},
    });

    expect(anonymizedMember.statusCode).toBe(200);
    expect(anonymizedMember.json().data.member.email).toContain('@redacted.vowgrid.invalid');

    const oldLogin = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: memberEmail,
        password: 'member_password_123',
      },
    });

    expect(oldLogin.statusCode).toBe(401);

    const exportResponse = await app.inject({
      method: 'GET',
      url: '/v1/workspace/export',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
    });

    expect(exportResponse.statusCode).toBe(200);
    expect(exportResponse.json().data.workspace.id).toBe(workspaceId);
    expect(exportResponse.json().data.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          email: expect.stringContaining('@redacted.vowgrid.invalid'),
          status: 'disabled',
        }),
      ]),
    );
  });
});
