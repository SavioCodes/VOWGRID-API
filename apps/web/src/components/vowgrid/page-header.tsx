import type { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-accent-soft)]">{eyebrow}</p>
        <div className="space-y-3">
          <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-[var(--color-text-primary)] md:text-5xl">
            {title}
          </h1>
          <p className="max-w-3xl text-base leading-7 text-[var(--color-text-secondary)]">{description}</p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
