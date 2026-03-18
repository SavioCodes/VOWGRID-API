import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildServer } from '../../apps/api/src/server.js';
import { prisma } from '../../apps/api/src/lib/prisma.js';

describe('workspace member management integration', () => {
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

  it('lets owners and admins manage members while blocking member and viewer access', async () => {
    const uniqueId = Date.now().toString();
    const signup = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        workspaceName: `Member Workspace ${uniqueId}`,
        name: 'Workspace Owner',
        email: `owner-${uniqueId}@vowgrid.local`,
        password: 'owner_password_123',
      },
    });

    expect(signup.statusCode).toBe(201);
    const signupBody = signup.json();
    const ownerToken = signupBody.data.session.token as string;
    const workspaceId = signupBody.data.workspace.id as string;
    createdWorkspaceIds.push(workspaceId);

    const createAdmin = await app.inject({
      method: 'POST',
      url: '/v1/workspace/members',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
      payload: {
        name: 'Workspace Admin',
        email: `admin-${uniqueId}@vowgrid.local`,
        role: 'admin',
        password: 'member_password_123',
      },
    });

    expect(createAdmin.statusCode).toBe(201);
    const adminMemberId = createAdmin.json().data.member.id as string;

    const adminLogin = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: `admin-${uniqueId}@vowgrid.local`,
        password: 'member_password_123',
      },
    });

    expect(adminLogin.statusCode).toBe(200);
    const adminToken = adminLogin.json().data.session.token as string;

    const createViewer = await app.inject({
      method: 'POST',
      url: '/v1/workspace/members',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      payload: {
        name: 'Workspace Viewer',
        email: `viewer-${uniqueId}@vowgrid.local`,
        role: 'viewer',
        password: 'viewer_password_123',
      },
    });

    expect(createViewer.statusCode).toBe(201);
    const viewerMemberId = createViewer.json().data.member.id as string;

    const viewerLogin = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: `viewer-${uniqueId}@vowgrid.local`,
        password: 'viewer_password_123',
      },
    });

    expect(viewerLogin.statusCode).toBe(200);
    const viewerToken = viewerLogin.json().data.session.token as string;

    const listMembers = await app.inject({
      method: 'GET',
      url: '/v1/workspace/members',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
    });

    expect(listMembers.statusCode).toBe(200);
    const members = listMembers.json().data as Array<{
      id: string;
      role: string;
      status: string;
    }>;
    expect(members).toHaveLength(3);
    expect(members.map((member) => member.role)).toEqual(['owner', 'admin', 'viewer']);
    expect(members.every((member) => member.status === 'active')).toBe(true);

    const viewerForbidden = await app.inject({
      method: 'GET',
      url: '/v1/workspace/members',
      headers: {
        Authorization: `Bearer ${viewerToken}`,
      },
    });

    expect(viewerForbidden.statusCode).toBe(403);

    const updateViewer = await app.inject({
      method: 'PATCH',
      url: `/v1/workspace/members/${viewerMemberId}`,
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      payload: {
        name: 'Operations Member',
        role: 'member',
      },
    });

    expect(updateViewer.statusCode).toBe(200);
    expect(updateViewer.json().data.member.role).toBe('member');

    const disableViewer = await app.inject({
      method: 'POST',
      url: `/v1/workspace/members/${viewerMemberId}/disable`,
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      payload: {},
    });

    expect(disableViewer.statusCode).toBe(200);
    expect(disableViewer.json().data.member.status).toBe('disabled');

    const disabledViewerLogin = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: `viewer-${uniqueId}@vowgrid.local`,
        password: 'viewer_password_123',
      },
    });

    expect(disabledViewerLogin.statusCode).toBe(401);

    const revokedViewerSession = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: {
        Authorization: `Bearer ${viewerToken}`,
      },
    });

    expect(revokedViewerSession.statusCode).toBe(401);

    const enableViewer = await app.inject({
      method: 'POST',
      url: `/v1/workspace/members/${viewerMemberId}/enable`,
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      payload: {},
    });

    expect(enableViewer.statusCode).toBe(200);
    expect(enableViewer.json().data.member.status).toBe('active');

    const memberLogin = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: `viewer-${uniqueId}@vowgrid.local`,
        password: 'viewer_password_123',
      },
    });

    expect(memberLogin.statusCode).toBe(200);
    const memberToken = memberLogin.json().data.session.token as string;

    const memberForbidden = await app.inject({
      method: 'GET',
      url: '/v1/workspace/members',
      headers: {
        Authorization: `Bearer ${memberToken}`,
      },
    });

    expect(memberForbidden.statusCode).toBe(403);

    const disableAdmin = await app.inject({
      method: 'POST',
      url: `/v1/workspace/members/${adminMemberId}/disable`,
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      payload: {},
    });

    expect(disableAdmin.statusCode).toBe(403);
  });

  it('enforces internal user limits using active member counts', async () => {
    const uniqueId = `${Date.now()}-limit`;
    const signup = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        workspaceName: `Limit Workspace ${uniqueId}`,
        name: 'Workspace Owner',
        email: `owner-limit-${uniqueId}@vowgrid.local`,
        password: 'owner_password_123',
      },
    });

    expect(signup.statusCode).toBe(201);
    const signupBody = signup.json();
    const ownerToken = signupBody.data.session.token as string;
    const workspaceId = signupBody.data.workspace.id as string;
    createdWorkspaceIds.push(workspaceId);

    const createdMemberIds: string[] = [];

    for (let index = 0; index < 9; index += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/workspace/members',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
        payload: {
          name: `Team Member ${index + 1}`,
          email: `limit-${uniqueId}-${index + 1}@vowgrid.local`,
          role: 'member',
          password: 'member_password_123',
        },
      });

      expect(response.statusCode).toBe(201);
      createdMemberIds.push(response.json().data.member.id as string);
    }

    const blockedResponse = await app.inject({
      method: 'POST',
      url: '/v1/workspace/members',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
      payload: {
        name: 'Overflow Member',
        email: `limit-${uniqueId}-overflow@vowgrid.local`,
        role: 'member',
        password: 'member_password_123',
      },
    });

    expect(blockedResponse.statusCode).toBe(402);
    expect(blockedResponse.json().error.code).toBe('BILLING_INTERNAL_USER_LIMIT_REACHED');

    const disableMember = await app.inject({
      method: 'POST',
      url: `/v1/workspace/members/${createdMemberIds[0]}/disable`,
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
      payload: {},
    });

    expect(disableMember.statusCode).toBe(200);

    const replacementResponse = await app.inject({
      method: 'POST',
      url: '/v1/workspace/members',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
      payload: {
        name: 'Replacement Member',
        email: `limit-${uniqueId}-replacement@vowgrid.local`,
        role: 'viewer',
        password: 'member_password_123',
      },
    });

    expect(replacementResponse.statusCode).toBe(201);
  });
});
