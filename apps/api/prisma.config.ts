import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'prisma/config';

const configDir = dirname(fileURLToPath(import.meta.url));
const localEnvPath = resolve(configDir, '.env');

if (typeof process.loadEnvFile === 'function' && existsSync(localEnvPath)) {
  process.loadEnvFile(localEnvPath);
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
