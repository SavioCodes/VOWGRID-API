import * as Sentry from '@sentry/node';
import { env } from '../config/env.js';

let sentryInitialized = false;

function buildDatadogUrl() {
  return `https://http-intake.logs.${env.DATADOG_SITE}/api/v2/logs`;
}

export function initializeErrorReporting() {
  if (env.SENTRY_DSN && !sentryInitialized) {
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      tracesSampleRate: 0,
      sendDefaultPii: false,
    });
    sentryInitialized = true;
  }
}

async function sendDatadogLog(payload: Record<string, unknown>) {
  if (!env.DATADOG_LOGS_API_KEY) {
    return;
  }

  await fetch(buildDatadogUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'DD-API-KEY': env.DATADOG_LOGS_API_KEY,
    },
    body: JSON.stringify([payload]),
  });
}

async function sendNewRelicLog(payload: Record<string, unknown>) {
  if (!env.NEW_RELIC_LICENSE_KEY) {
    return;
  }

  await fetch(env.NEW_RELIC_LOGS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': env.NEW_RELIC_LICENSE_KEY,
    },
    body: JSON.stringify([payload]),
  });
}

async function sendSlackAlert(payload: Record<string, unknown>) {
  if (!env.SLACK_ALERT_WEBHOOK_URL) {
    return;
  }

  const summary = [
    `*Source:* ${String(payload.source ?? 'unknown')}`,
    `*Environment:* ${String(payload.environment ?? env.NODE_ENV)}`,
    `*Message:* ${String(payload.message ?? 'Operational error')}`,
  ];

  if (payload.requestId) {
    summary.push(`*Request ID:* ${String(payload.requestId)}`);
  }

  await fetch(env.SLACK_ALERT_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: `VowGrid operational error: ${String(payload.message ?? 'Operational error')}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: summary.join('\n'),
          },
        },
      ],
    }),
  });
}

export async function reportOperationalError(input: {
  source: string;
  message: string;
  error?: Error;
  context?: Record<string, unknown>;
}) {
  const payload = {
    source: input.source,
    message: input.message,
    environment: env.NODE_ENV,
    errorName: input.error?.name,
    stack: input.error?.stack,
    ...input.context,
  };

  const tasks: Array<Promise<unknown>> = [];

  if (env.SENTRY_DSN && input.error) {
    Sentry.captureException(input.error, {
      tags: {
        source: input.source,
      },
      extra: input.context,
    });
  }

  if (env.DATADOG_LOGS_API_KEY) {
    tasks.push(sendDatadogLog(payload));
  }

  if (env.NEW_RELIC_LICENSE_KEY) {
    tasks.push(sendNewRelicLog(payload));
  }

  if (env.SLACK_ALERT_WEBHOOK_URL) {
    tasks.push(sendSlackAlert(payload));
  }

  if (tasks.length > 0) {
    await Promise.allSettled(tasks);
  }
}
