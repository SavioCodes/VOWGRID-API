import { createWriteStream, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';

function parseArgs(argv) {
  const args = new Map();

  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];
    if (!entry.startsWith('--')) {
      continue;
    }

    const key = entry.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      args.set(key, next);
      index += 1;
      continue;
    }

    args.set(key, 'true');
  }

  return args;
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function waitForExit(child) {
  return new Promise((resolvePromise, rejectPromise) => {
    let stderr = '';

    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', rejectPromise);
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise(undefined);
        return;
      }

      rejectPromise(new Error(stderr.trim() || `Backup process exited with code ${code}.`));
    });
  });
}

const args = parseArgs(process.argv.slice(2));
const container = args.get('container') ?? process.env.VOWGRID_POSTGRES_CONTAINER ?? 'vowgrid-postgres';
const user = args.get('user') ?? process.env.VOWGRID_POSTGRES_USER ?? 'vowgrid';
const password = args.get('password') ?? process.env.VOWGRID_POSTGRES_PASSWORD ?? 'vowgrid_dev';
const database = args.get('database') ?? process.env.VOWGRID_POSTGRES_DB ?? 'vowgrid';
const outputPath =
  args.get('output') ??
  resolve(process.cwd(), 'backups', 'postgres', `vowgrid-${timestamp()}.sql.gz`);

mkdirSync(dirname(outputPath), { recursive: true });

const backup = spawn(
  'docker',
  [
    'exec',
    '-e',
    `PGPASSWORD=${password}`,
    container,
    'pg_dump',
    '-U',
    user,
    '-d',
    database,
    '--clean',
    '--if-exists',
    '--no-owner',
    '--no-privileges',
  ],
  {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  },
);

await Promise.all([
  pipeline(backup.stdout, createGzip(), createWriteStream(outputPath)),
  waitForExit(backup),
]);

process.stdout.write(`Database backup written to ${outputPath}\n`);
