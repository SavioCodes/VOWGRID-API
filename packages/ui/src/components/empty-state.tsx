import type { ReactNode } from 'react';
import { Card, CardContent } from './card';

interface EmptyStateProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <Card className="border-dashed border-[var(--color-border-strong)] bg-[rgba(14,20,37,0.78)]">
      <CardContent className="space-y-4 py-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-border)] bg-[rgba(79,124,255,0.12)] text-sm font-semibold text-[var(--color-accent-soft)]">
          VG
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
            {title}
          </h3>
          <p className="mx-auto max-w-xl text-sm leading-6 text-[var(--color-text-secondary)]">
            {description}
          </p>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
