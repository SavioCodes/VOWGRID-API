import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const content = readFileSync(filePath, 'utf8');
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separatorIndex = line.indexOf('=');
        return [line.slice(0, separatorIndex).trim(), line.slice(separatorIndex + 1).trim()];
      }),
  );
}

function hasValue(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

async function checkHttp(url) {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
    });
    return response.ok ? 'ok' : `http_${response.status}`;
  } catch {
    return 'unreachable';
  }
}

const args = parseArgs(process.argv.slice(2));
const root = process.cwd();
const mergedEnv = {
  ...parseEnvFile(resolve(root, 'infra', '.env.production')),
  ...parseEnvFile(resolve(root, 'infra', 'api.env')),
  ...parseEnvFile(resolve(root, 'infra', 'web.env')),
  ...process.env,
};

const checks = [
  {
    label: 'Mercado Pago access token',
    ok: hasValue(mergedEnv.MERCADO_PAGO_ACCESS_TOKEN),
  },
  {
    label: 'Mercado Pago webhook secret',
    ok: hasValue(mergedEnv.MERCADO_PAGO_WEBHOOK_SECRET),
  },
  {
    label: 'Mercado Pago webhook URL',
    ok: hasValue(mergedEnv.MERCADO_PAGO_WEBHOOK_URL),
  },
  {
    label: 'GitHub OAuth credentials',
    ok:
      hasValue(mergedEnv.GITHUB_OAUTH_CLIENT_ID) &&
      hasValue(mergedEnv.GITHUB_OAUTH_CLIENT_SECRET),
  },
  {
    label: 'Google OAuth credentials',
    ok:
      hasValue(mergedEnv.GOOGLE_OAUTH_CLIENT_ID) &&
      hasValue(mergedEnv.GOOGLE_OAUTH_CLIENT_SECRET),
  },
  {
    label: 'Primary production domain',
    ok: hasValue(mergedEnv.VOWGRID_PRIMARY_DOMAIN) && hasValue(mergedEnv.VOWGRID_WEB_BASE_URL),
  },
  {
    label: 'SMTP delivery',
    ok:
      hasValue(mergedEnv.SMTP_HOST) &&
      hasValue(mergedEnv.SMTP_USER) &&
      hasValue(mergedEnv.SMTP_PASS) &&
      hasValue(mergedEnv.MAIL_FROM_EMAIL),
  },
];

const shouldCheckNetwork = args.get('skip-network') !== 'true' && hasValue(mergedEnv.VOWGRID_PRIMARY_DOMAIN);
if (shouldCheckNetwork) {
  const domain = mergedEnv.VOWGRID_PRIMARY_DOMAIN.replace(/^https?:\/\//, '');
  const [healthStatus, docsStatus] = await Promise.all([
    checkHttp(`https://${domain}/v1/health`),
    checkHttp(`https://${domain}/v1/docs`),
  ]);

  checks.push(
    {
      label: 'Production health endpoint',
      ok: healthStatus === 'ok',
      detail: healthStatus,
    },
    {
      label: 'Production Swagger docs',
      ok: docsStatus === 'ok',
      detail: docsStatus,
    },
  );
}

let failed = false;
for (const check of checks) {
  if (!check.ok) {
    failed = true;
  }

  process.stdout.write(
    `${check.ok ? 'PASS' : 'FAIL'}  ${check.label}${check.detail ? ` (${check.detail})` : ''}\n`,
  );
}

if (failed) {
  process.exitCode = 1;
}
