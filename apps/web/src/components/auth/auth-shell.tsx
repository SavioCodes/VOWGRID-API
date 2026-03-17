import type { ReactNode } from 'react';
import Link from 'next/link';
import { Badge } from '@vowgrid/ui';

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden">
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-10 px-4 py-6 lg:px-6">
        <header className="surface-ring rounded-[36px] border border-[var(--color-border)] bg-[rgba(8,13,25,0.8)] px-6 py-5">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(79,124,255,0.24)] bg-[rgba(79,124,255,0.14)] text-lg font-semibold text-[var(--color-accent-soft)]"
              >
                VG
              </Link>
              <div>
                <p className="text-lg font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
                  VowGrid
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Every AI action needs context, permission, and proof.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="accent">Dashboard auth</Badge>
              <Badge tone="mint">Session-backed</Badge>
            </div>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="space-y-6">
            <Badge tone="mint">{eyebrow}</Badge>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-balance text-5xl font-semibold tracking-[-0.07em] text-[var(--color-text-primary)] md:text-7xl">
                {title}
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-[var(--color-text-secondary)]">
                {description}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                'Session-backed dashboard access',
                'Owner signup creates the first workspace',
                'API keys stay separate for agents',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[24px] border border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] px-4 py-4 text-sm leading-6 text-[var(--color-text-secondary)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="surface-ring rounded-[32px] border border-[var(--color-border)] bg-[rgba(7,11,22,0.86)] p-6">
            {children}
            <div className="mt-6 border-t border-[var(--color-border)] pt-5 text-sm text-[var(--color-text-secondary)]">
              {footer}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
