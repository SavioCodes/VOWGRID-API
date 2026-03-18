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

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  APP_WEB_BASE_URL: z.string().url().default('http://localhost:3000'),

  SESSION_SECRET: z.string().min(16).optional(),
  JWT_SECRET: z.string().min(16).optional(),
  API_KEY_SALT: z.string().min(16),

  MAIL_FROM_EMAIL: z.string().email().optional(),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((value) => value === 'true'),

  GITHUB_OAUTH_CLIENT_ID: z.string().min(1).optional(),
  GITHUB_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_OAUTH_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),

  MERCADO_PAGO_ACCESS_TOKEN: z.string().min(1).optional(),
  MERCADO_PAGO_API_BASE_URL: z.string().url().default('https://api.mercadopago.com'),
  MERCADO_PAGO_WEBHOOK_SECRET: z.string().min(1).optional(),
  MERCADO_PAGO_WEBHOOK_URL: z.string().url().optional(),
  MERCADO_PAGO_RETURN_URL: z.string().url().optional(),
  BILLING_DEFAULT_TAX_RATE_BPS: z.coerce.number().min(0).max(10_000).default(0),
  METRICS_AUTH_TOKEN: z.string().min(16).optional(),

  RATE_LIMIT_MAX: z.coerce.number().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().optional(),
});

export type Env = Omit<
  z.infer<typeof envSchema>,
  'SESSION_SECRET' | 'RATE_LIMIT_MAX' | 'RATE_LIMIT_WINDOW_MS'
> & {
  SESSION_SECRET: string;
  RATE_LIMIT_MAX: number;
  RATE_LIMIT_WINDOW_MS: number;
};

export function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
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
    RATE_LIMIT_MAX:
      result.data.RATE_LIMIT_MAX ?? (result.data.NODE_ENV === 'production' ? 100 : 1_000),
    RATE_LIMIT_WINDOW_MS: result.data.RATE_LIMIT_WINDOW_MS ?? 60_000,
  };
}

export const env = loadEnv();
