import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';

const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SESSION_TTL_DAYS = 30;

function scrypt(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      SCRYPT_KEY_LENGTH,
      {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: SCRYPT_PARALLELIZATION,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey as Buffer);
      },
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt);
  return ['scrypt', salt.toString('base64url'), derivedKey.toString('base64url')].join('$');
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [scheme, saltBase64, hashBase64] = storedHash.split('$');

  if (scheme !== 'scrypt' || !saltBase64 || !hashBase64) {
    return false;
  }

  const salt = Buffer.from(saltBase64, 'base64url');
  const expected = Buffer.from(hashBase64, 'base64url');
  const actual = await scrypt(password, salt);

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}

export function generateSessionToken() {
  return randomBytes(32).toString('base64url');
}

export function generateOpaqueToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

function getSessionSecret() {
  const sessionSecret = process.env.SESSION_SECRET ?? process.env.JWT_SECRET;

  if (!sessionSecret) {
    throw new Error('SESSION_SECRET is required to hash session tokens.');
  }

  return sessionSecret;
}

export function hashSessionToken(token: string) {
  return createHash('sha256').update(`${getSessionSecret()}:${token}`).digest('hex');
}

export function hashOpaqueToken(token: string) {
  return createHash('sha256').update(`${getSessionSecret()}:opaque:${token}`).digest('hex');
}

export function buildSessionExpiry(from = new Date()) {
  return new Date(from.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}
