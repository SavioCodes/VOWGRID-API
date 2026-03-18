import { createHash, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';

export function hashApiKey(key: string): string {
  return createHash('sha256').update(`${env.API_KEY_SALT}:${key}`).digest('hex');
}

export function buildApiKeyPrefix(key: string) {
  return key.slice(0, 12);
}

export function generateApiKeySecret() {
  return `vgk_${randomBytes(24).toString('base64url')}`;
}
