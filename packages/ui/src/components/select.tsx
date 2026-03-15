import type { SelectHTMLAttributes } from 'react';
import { cx } from '../lib/cx';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cx(
        'min-h-11 w-full rounded-2xl border border-[var(--color-border)] bg-[rgba(9,14,28,0.9)] px-4 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-border-highlight)] focus:ring-2 focus:ring-[rgba(79,124,255,0.18)]',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
