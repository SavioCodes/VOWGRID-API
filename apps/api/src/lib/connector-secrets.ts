import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';

const CONNECTOR_CONFIG_ENVELOPE_MARKER = '__vowgridEncrypted';
const CONNECTOR_CONFIG_ENVELOPE_VERSION = 1;
const CONNECTOR_CONFIG_ALGORITHM = 'aes-256-gcm';
const CONNECTOR_CONFIG_IV_BYTES = 12;

interface EncryptedConnectorConfigEnvelope {
  __vowgridEncrypted: true;
  version: 1;
  algorithm: 'aes-256-gcm';
  iv: string;
  tag: string;
  ciphertext: string;
}

function deriveConnectorConfigKey() {
  return createHash('sha256').update(env.CONNECTOR_CONFIG_ENCRYPTION_KEY).digest();
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isEncryptedConnectorConfig(
  value: unknown,
): value is EncryptedConnectorConfigEnvelope {
  return (
    isPlainRecord(value) &&
    value[CONNECTOR_CONFIG_ENVELOPE_MARKER] === true &&
    value.version === CONNECTOR_CONFIG_ENVELOPE_VERSION &&
    value.algorithm === CONNECTOR_CONFIG_ALGORITHM &&
    typeof value.iv === 'string' &&
    typeof value.tag === 'string' &&
    typeof value.ciphertext === 'string'
  );
}

export function hasConnectorConfig(value: unknown) {
  if (isEncryptedConnectorConfig(value)) {
    return true;
  }

  return isPlainRecord(value) && Object.keys(value).length > 0;
}

export function encryptConnectorConfig(
  config: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!config || Object.keys(config).length === 0) {
    return null;
  }

  const iv = randomBytes(CONNECTOR_CONFIG_IV_BYTES);
  const cipher = createCipheriv(CONNECTOR_CONFIG_ALGORITHM, deriveConnectorConfigKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(config), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    [CONNECTOR_CONFIG_ENVELOPE_MARKER]: true,
    version: CONNECTOR_CONFIG_ENVELOPE_VERSION,
    algorithm: CONNECTOR_CONFIG_ALGORITHM,
    iv: iv.toString('base64url'),
    tag: tag.toString('base64url'),
    ciphertext: ciphertext.toString('base64url'),
  };
}

export function decryptConnectorConfig(value: unknown): Record<string, unknown> {
  if (!value) {
    return {};
  }

  if (!isEncryptedConnectorConfig(value)) {
    return isPlainRecord(value) ? value : {};
  }

  const decipher = createDecipheriv(
    CONNECTOR_CONFIG_ALGORITHM,
    deriveConnectorConfigKey(),
    Buffer.from(value.iv, 'base64url'),
  );

  decipher.setAuthTag(Buffer.from(value.tag, 'base64url'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');

  const parsed = JSON.parse(decrypted) as unknown;

  if (!isPlainRecord(parsed)) {
    throw new Error('Connector config decrypted into an invalid payload.');
  }

  return parsed;
}

export function redactConnectorConfig(value: unknown): Record<string, unknown> | null {
  if (!hasConnectorConfig(value)) {
    return null;
  }

  return {
    redacted: true,
    encryptedAtRest: isEncryptedConnectorConfig(value),
  };
}
