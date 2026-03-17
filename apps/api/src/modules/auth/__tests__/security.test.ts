import { describe, expect, it } from 'vitest';
import {
  buildSessionExpiry,
  generateSessionToken,
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from '../security.js';

describe('auth security helpers', () => {
  process.env.SESSION_SECRET = 'test-session-secret-value';

  it('hashes and verifies passwords', async () => {
    const password = 'local-dev-password';
    const hash = await hashPassword(password);

    await expect(verifyPassword(password, hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });

  it('generates opaque session tokens and hashes them deterministically', () => {
    const token = generateSessionToken();

    expect(token).toHaveLength(43);
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
  });

  it('builds session expiry in the future', () => {
    const now = new Date('2026-03-17T00:00:00.000Z');
    const expiresAt = buildSessionExpiry(now);

    expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
  });
});
