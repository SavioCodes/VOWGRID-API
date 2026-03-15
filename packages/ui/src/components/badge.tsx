import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx';

type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'mint';

const toneStyles: Record<BadgeTone, string> = {
  neutral: 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]',
  accent: 'border-[rgba(79,124,255,0.25)] bg-[rgba(79,124,255,0.12)] text-[var(--color-accent-soft)]',
  success: 'border-[rgba(46,211,183,0.24)] bg-[rgba(46,211,183,0.14)] text-[var(--color-success)]',
  warning: 'border-[rgba(245,185,66,0.24)] bg-[rgba(245,185,66,0.14)] text-[var(--color-warning)]',
  danger: 'border-[rgba(245,89,89,0.24)] bg-[rgba(245,89,89,0.14)] text-[var(--color-danger)]',
  mint: 'border-[rgba(46,211,183,0.24)] bg-[rgba(12,44,45,0.8)] text-[var(--color-success)]',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  children?: ReactNode;
}

export function Badge({ children, className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em]',
        toneStyles[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
