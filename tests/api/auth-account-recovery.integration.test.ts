import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildServer } from '../../apps/api/src/server.js';
import { prisma } from '../../apps/api/src/lib/prisma.js';
import { generateOpaqueToken, hashOpaqueToken } from '../../apps/api/src/modules/auth/security.js';

describe('auth account recovery integration', () => {
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

  it('requests password resets and confirms them with a valid token', async () => {
    const uniqueId = `${Date.now()}-recovery`;
    const email = `recovery-${uniqueId}@vowgrid.local`;
    const signup = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        workspaceName: `Recovery Workspace ${uniqueId}`,
        name: 'Recovery Owner',
        email,
        password: 'original_password_123',
      },
    });

    expect(signup.statusCode).toBe(201);
    const workspaceId = signup.json().data.workspace.id as string;
    createdWorkspaceIds.push(workspaceId);

    const requestReset = await app.inject({
      method: 'POST',
      url: '/v1/auth/password-reset/request',
      payload: {
        email,
      },
    });

    expect(requestReset.statusCode).toBe(200);
    expect(requestReset.json().data.requested).toBe(true);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email },
      select: { id: true },
    });
    const resetRecord = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    expect(resetRecord).not.toBeNull();

    const manualToken = generateOpaqueToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashOpaqueToken(manualToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const confirmReset = await app.inject({
      method: 'POST',
      url: '/v1/auth/password-reset/confirm',
      payload: {
        token: manualToken,
        password: 'replacement_password_123',
      },
    });

    expect(confirmReset.statusCode).toBe(200);
    expect(confirmReset.json().data.reset).toBe(true);

    const oldLogin = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email,
        password: 'original_password_123',
      },
    });

    expect(oldLogin.statusCode).toBe(401);

    const newLogin = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email,
        password: 'replacement_password_123',
      },
    });

    expect(newLogin.statusCode).toBe(200);
  });

  it('requests verification links and marks the account verified when a valid token is consumed', async () => {
    const uniqueId = `${Date.now()}-verify`;
    const email = `verify-${uniqueId}@vowgrid.local`;
    const signup = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        workspaceName: `Verify Workspace ${uniqueId}`,
        name: 'Verification Owner',
        email,
        password: 'verification_password_123',
      },
    });

    expect(signup.statusCode).toBe(201);
    const signupBody = signup.json().data;
    createdWorkspaceIds.push(signupBody.workspace.id as string);
    const sessionToken = signupBody.session.token as string;

    const requestVerification = await app.inject({
      method: 'POST',
      url: '/v1/auth/email-verification/request',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
      payload: {},
    });

    expect(requestVerification.statusCode).toBe(200);
    expect(requestVerification.json().data.requested).toBe(true);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email },
      select: { id: true, emailVerifiedAt: true },
    });
    expect(user.emailVerifiedAt).toBeNull();

    const verificationRecord = await prisma.emailVerificationToken.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    expect(verificationRecord).not.toBeNull();

    const manualToken = generateOpaqueToken();
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        email,
        tokenHash: hashOpaqueToken(manualToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const verifyEmail = await app.inject({
      method: 'POST',
      url: '/v1/auth/email-verification/verify',
      payload: {
        token: manualToken,
      },
    });

    expect(verifyEmail.statusCode).toBe(200);
    expect(verifyEmail.json().data.verified).toBe(true);

    const refreshedUser = await prisma.user.findUniqueOrThrow({
      where: { email },
      select: { emailVerifiedAt: true },
    });

    expect(refreshedUser.emailVerifiedAt).not.toBeNull();
  });
});
