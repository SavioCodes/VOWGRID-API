import type { InputHTMLAttributes } from 'react';
import { cx } from '../lib/cx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cx(
        'min-h-11 w-full rounded-2xl border border-[var(--color-border)] bg-[rgba(9,14,28,0.9)] px-4 text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-border-highlight)] focus:ring-2 focus:ring-[rgba(79,124,255,0.18)]',
        className,
      )}
      {...props}
    />
  );
}
