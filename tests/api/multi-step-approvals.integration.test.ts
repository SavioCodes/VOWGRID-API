import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildServer } from '../../apps/api/src/server.js';
import { prisma } from '../../apps/api/src/lib/prisma.js';

describe('multi-step approvals integration', () => {
  const createdWorkspaceIds: string[] = [];
  let app: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    await prisma.$connect();
    app = await buildServer();
  });

  afterAll(async () => {
    if (createdWorkspaceIds.length > 0) {
      await prisma.approvalDecision.deleteMany({
        where: {
          approvalRequest: {
            intent: {
              workspaceId: {
                in: createdWorkspaceIds,
              },
            },
          },
        },
      });

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

  it('advances approval requests stage by stage and enforces reviewer roles', async () => {
    const uniqueId = Date.now().toString();
    const ownerEmail = `owner-approval-${uniqueId}@vowgrid.local`;
    const adminEmail = `admin-approval-${uniqueId}@vowgrid.local`;
    const memberEmail = `member-approval-${uniqueId}@vowgrid.local`;

    const signup = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        workspaceName: `Approval Workspace ${uniqueId}`,
        name: 'Approval Owner',
        email: ownerEmail,
        password: 'owner_password_123',
      },
    });

    expect(signup.statusCode).toBe(201);
    const ownerToken = signup.json().data.session.token as string;
    const workspaceId = signup.json().data.workspace.id as string;
    createdWorkspaceIds.push(workspaceId);

    const [createdAdmin, createdMember] = await Promise.all([
      app.inject({
        method: 'POST',
        url: '/v1/workspace/members',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
        payload: {
          name: 'Approval Admin',
          email: adminEmail,
          role: 'admin',
          password: 'admin_password_123',
        },
      }),
      app.inject({
        method: 'POST',
        url: '/v1/workspace/members',
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
        payload: {
          name: 'Approval Member',
          email: memberEmail,
          role: 'member',
          password: 'member_password_123',
        },
      }),
    ]);

    expect(createdAdmin.statusCode).toBe(201);
    expect(createdMember.statusCode).toBe(201);

    const [adminLogin, memberLogin] = await Promise.all([
      app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: {
          email: adminEmail,
          password: 'admin_password_123',
        },
      }),
      app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: {
          email: memberEmail,
          password: 'member_password_123',
        },
      }),
    ]);

    expect(adminLogin.statusCode).toBe(200);
    expect(memberLogin.statusCode).toBe(200);
    const adminToken = adminLogin.json().data.session.token as string;
    const memberToken = memberLogin.json().data.session.token as string;

    const [agent, connector] = await Promise.all([
      prisma.agent.create({
        data: {
          name: `Approval Agent ${uniqueId}`,
          type: 'external',
          workspaceId,
        },
      }),
      prisma.connector.create({
        data: {
          name: `Approval Connector ${uniqueId}`,
          type: 'mock',
          rollbackSupport: 'supported',
          workspaceId,
          enabled: true,
        },
      }),
    ]);

    const intentResponse = await app.inject({
      method: 'POST',
      url: '/v1/intents',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
      payload: {
        title: `Approval intent ${uniqueId}`,
        action: 'rotate_secret',
        agentId: agent.id,
        connectorId: connector.id,
        environment: 'production',
      },
    });

    expect(intentResponse.statusCode).toBe(201);
    const intentId = intentResponse.json().data.id as string;

    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/v1/intents/${intentId}/propose`,
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
          payload: {},
        })
      ).statusCode,
    ).toBe(200);

    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/v1/intents/${intentId}/simulate`,
          headers: {
            Authorization: `Bearer ${ownerToken}`,
          },
          payload: {},
        })
      ).statusCode,
    ).toBe(200);

    const approvalSubmission = await app.inject({
      method: 'POST',
      url: `/v1/intents/${intentId}/submit-for-approval`,
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
      payload: {
        stages: [
          {
            label: 'Operations review',
            requiredCount: 1,
            reviewerRoles: ['admin'],
          },
          {
            label: 'Business sign-off',
            requiredCount: 1,
            reviewerRoles: ['member'],
          },
        ],
      },
    });

    expect(approvalSubmission.statusCode).toBe(200);
    expect(approvalSubmission.json().data.approvalRequest.mode).toBe('multi_step');
    expect(approvalSubmission.json().data.approvalRequest.stages).toHaveLength(2);

    const approvalRequestId = approvalSubmission.json().data.approvalRequest.id as string;

    const prematureMemberDecision = await app.inject({
      method: 'POST',
      url: `/v1/approvals/${approvalRequestId}/decisions`,
      headers: {
        Authorization: `Bearer ${memberToken}`,
      },
      payload: {
        decision: 'approved',
        rationale: 'Trying to skip the admin stage',
      },
    });

    expect(prematureMemberDecision.statusCode).toBe(403);

    const adminDecision = await app.inject({
      method: 'POST',
      url: `/v1/approvals/${approvalRequestId}/decisions`,
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      payload: {
        decision: 'approved',
        rationale: 'Operations review approved',
      },
    });

    expect(adminDecision.statusCode).toBe(200);
    expect(adminDecision.json().data.approvalRequest.status).toBe('pending');
    expect(adminDecision.json().data.approvalRequest.currentStageIndex).toBe(1);
    expect(adminDecision.json().data.decision.stageLabel).toBe('Operations review');

    const memberDecision = await app.inject({
      method: 'POST',
      url: `/v1/approvals/${approvalRequestId}/decisions`,
      headers: {
        Authorization: `Bearer ${memberToken}`,
      },
      payload: {
        decision: 'approved',
        rationale: 'Business sign-off approved',
      },
    });

    expect(memberDecision.statusCode).toBe(200);
    expect(memberDecision.json().data.approvalRequest.status).toBe('approved');
    expect(memberDecision.json().data.approvalRequest.currentCount).toBe(2);
    expect(memberDecision.json().data.approvalRequest.stages[0].status).toBe('approved');
    expect(memberDecision.json().data.approvalRequest.stages[1].status).toBe('approved');

    const intentDetail = await app.inject({
      method: 'GET',
      url: `/v1/intents/${intentId}`,
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
    });

    expect(intentDetail.statusCode).toBe(200);
    expect(intentDetail.json().data.status).toBe('approved');
    expect(intentDetail.json().data.approvalRequest.stages).toHaveLength(2);
    expect(intentDetail.json().data.approvalRequest.decisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stageLabel: 'Operations review',
        }),
        expect.objectContaining({
          stageLabel: 'Business sign-off',
        }),
      ]),
    );
  });
});
