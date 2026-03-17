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

  SESSION_SECRET: z.string().min(16).optional(),
  JWT_SECRET: z.string().min(16).optional(),
  API_KEY_SALT: z.string().min(16),

  MERCADO_PAGO_ACCESS_TOKEN: z.string().min(1).optional(),
  MERCADO_PAGO_API_BASE_URL: z.string().url().default('https://api.mercadopago.com'),
  MERCADO_PAGO_WEBHOOK_SECRET: z.string().min(1).optional(),
  MERCADO_PAGO_WEBHOOK_URL: z.string().url().optional(),
  MERCADO_PAGO_RETURN_URL: z.string().url().optional(),

  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
});

export type Env = z.infer<typeof envSchema> & {
  SESSION_SECRET: string;
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
  };
}

export const env = loadEnv();
