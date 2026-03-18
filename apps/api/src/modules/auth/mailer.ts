import { logger } from '../../lib/logger.js';
import { env } from '../../config/env.js';

let createTransport: typeof import('nodemailer').createTransport | null = null;

async function getTransport() {
  if (!env.SMTP_HOST || !env.MAIL_FROM_EMAIL) {
    return null;
  }

  if (!createTransport) {
    const nodemailer = await import('nodemailer');
    createTransport = nodemailer.createTransport;
  }

  return createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_SECURE,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          }
        : undefined,
  });
}

export async function sendAuthEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const transport = await getTransport();

  if (!transport || !env.MAIL_FROM_EMAIL) {
    logger.info(
      {
        to: input.to,
        subject: input.subject,
        preview: input.text,
      },
      'Auth email delivery fell back to application logs because SMTP is not configured',
    );

    return {
      delivered: false,
      mode: 'log' as const,
    };
  }

  await transport.sendMail({
    from: env.MAIL_FROM_EMAIL,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  return {
    delivered: true,
    mode: 'smtp' as const,
  };
}
