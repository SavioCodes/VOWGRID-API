import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const configDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(configDir, '../..');
const localEnvPath = resolve(appRoot, '.env');

if (typeof process.loadEnvFile === 'function' && existsSync(localEnvPath)) {
  process.loadEnvFile(localEnvPath);
}

const optionalString = () =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim().length === 0 ? undefined : value),
    z.string().min(1).optional(),
  );

const optionalUrl = () =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim().length === 0 ? undefined : value),
    z.string().url().optional(),
  );

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  APP_WEB_BASE_URL: z.string().url().default('http://localhost:3000'),
  CORS_ALLOWED_ORIGINS: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(',')
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0)
        : [],
    ),

  SESSION_SECRET: z.preprocess(
    (value) => (typeof value === 'string' && value.trim().length === 0 ? undefined : value),
    z.string().min(16).optional(),
  ),
  JWT_SECRET: z.preprocess(
    (value) => (typeof value === 'string' && value.trim().length === 0 ? undefined : value),
    z.string().min(16).optional(),
  ),
  API_KEY_SALT: z.string().min(16),
  AUDIT_LOG_HMAC_KEY: z.preprocess(
    (value) => (typeof value === 'string' && value.trim().length === 0 ? undefined : value),
    z.string().min(16).optional(),
  ),
  CONNECTOR_CONFIG_ENCRYPTION_KEY: z.preprocess(
    (value) => (typeof value === 'string' && value.trim().length === 0 ? undefined : value),
    z.string().min(16).optional(),
  ),

  MAIL_FROM_EMAIL: z.preprocess(
    (value) => (typeof value === 'string' && value.trim().length === 0 ? undefined : value),
    z.string().email().optional(),
  ),
  SMTP_HOST: optionalString(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: optionalString(),
  SMTP_PASS: optionalString(),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((value) => value === 'true'),

  GITHUB_OAUTH_CLIENT_ID: optionalString(),
  GITHUB_OAUTH_CLIENT_SECRET: optionalString(),
  GOOGLE_OAUTH_CLIENT_ID: optionalString(),
  GOOGLE_OAUTH_CLIENT_SECRET: optionalString(),

  MERCADO_PAGO_ACCESS_TOKEN: optionalString(),
  MERCADO_PAGO_API_BASE_URL: z.string().url().default('https://api.mercadopago.com'),
  MERCADO_PAGO_WEBHOOK_SECRET: optionalString(),
  MERCADO_PAGO_WEBHOOK_URL: optionalUrl(),
  MERCADO_PAGO_RETURN_URL: optionalUrl(),
  BILLING_DEFAULT_TAX_RATE_BPS: z.coerce.number().min(0).max(10_000).default(0),
  BILLING_BR_CPF_TAX_RATE_BPS: z.coerce.number().min(0).max(10_000).default(0),
  BILLING_BR_CNPJ_TAX_RATE_BPS: z.coerce.number().min(0).max(10_000).default(0),
  BILLING_COUPON_CATALOG_JSON: optionalString(),
  METRICS_AUTH_TOKEN: z.preprocess(
    (value) => (typeof value === 'string' && value.trim().length === 0 ? undefined : value),
    z.string().min(16).optional(),
  ),
  SENTRY_DSN: optionalUrl(),
  SLACK_ALERT_WEBHOOK_URL: optionalUrl(),
  DATADOG_LOGS_API_KEY: optionalString(),
  DATADOG_SITE: z.string().default('datadoghq.com'),
  NEW_RELIC_LICENSE_KEY: optionalString(),
  NEW_RELIC_LOGS_URL: z.string().url().default('https://log-api.newrelic.com/log/v1'),

  RATE_LIMIT_MAX: z.coerce.number().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().optional(),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().optional(),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().optional(),
  API_KEY_DEFAULT_TTL_DAYS: z.coerce.number().int().min(1).max(3650).default(90),
  API_KEY_MAX_TTL_DAYS: z.coerce.number().int().min(1).max(3650).default(365),
});

export type Env = Omit<
  z.infer<typeof envSchema>,
  | 'SESSION_SECRET'
  | 'RATE_LIMIT_MAX'
  | 'RATE_LIMIT_WINDOW_MS'
  | 'AUTH_RATE_LIMIT_MAX'
  | 'AUTH_RATE_LIMIT_WINDOW_MS'
  | 'AUDIT_LOG_HMAC_KEY'
  | 'CONNECTOR_CONFIG_ENCRYPTION_KEY'
> & {
  SESSION_SECRET: string;
  AUDIT_LOG_HMAC_KEY: string;
  CONNECTOR_CONFIG_ENCRYPTION_KEY: string;
  RATE_LIMIT_MAX: number;
  RATE_LIMIT_WINDOW_MS: number;
  AUTH_RATE_LIMIT_MAX: number;
  AUTH_RATE_LIMIT_WINDOW_MS: number;
};

export function loadEnv(): Env {
  const normalizedProcessEnv = {
    ...process.env,
    DATABASE_URL:
      process.env.DATABASE_URL?.trim() ||
      process.env.POSTGRES_PRISMA_URL?.trim() ||
      process.env.POSTGRES_URL?.trim(),
  };

  const result = envSchema.safeParse(normalizedProcessEnv);
  if (!result.success) {
    console.error('Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }

  const sessionSecret = result.data.SESSION_SECRET ?? result.data.JWT_SECRET;

  if (!sessionSecret) {
    console.error('Invalid environment variables: SESSION_SECRET is required.');
    process.exit(1);
  }

  return {
    ...result.data,
    SESSION_SECRET: sessionSecret,
    AUDIT_LOG_HMAC_KEY: result.data.AUDIT_LOG_HMAC_KEY ?? sessionSecret,
    CONNECTOR_CONFIG_ENCRYPTION_KEY: result.data.CONNECTOR_CONFIG_ENCRYPTION_KEY ?? sessionSecret,
    RATE_LIMIT_MAX:
      result.data.RATE_LIMIT_MAX ?? (result.data.NODE_ENV === 'production' ? 300 : 1_000),
    RATE_LIMIT_WINDOW_MS: result.data.RATE_LIMIT_WINDOW_MS ?? 60_000,
    AUTH_RATE_LIMIT_MAX:
      result.data.AUTH_RATE_LIMIT_MAX ?? (result.data.NODE_ENV === 'production' ? 10 : 100),
    AUTH_RATE_LIMIT_WINDOW_MS: result.data.AUTH_RATE_LIMIT_WINDOW_MS ?? 15 * 60_000,
  };
}

export const env = loadEnv();
