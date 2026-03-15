import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx';

type ButtonTone = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone;
  block?: boolean;
  children?: ReactNode;
}

const toneStyles: Record<ButtonTone, string> = {
  primary:
    'bg-[var(--color-accent)] text-[var(--color-bg)] shadow-[0_18px_48px_rgba(79,124,255,0.26)] hover:bg-[color-mix(in_oklab,var(--color-accent)_88%,white)]',
  secondary:
    'border border-[var(--color-border-strong)] bg-[var(--color-panel)] text-[var(--color-text-primary)] hover:border-[var(--color-border-highlight)] hover:bg-[var(--color-panel-alt)]',
  ghost:
    'border border-transparent bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-panel-alt)] hover:text-[var(--color-text-primary)]',
  danger:
    'border border-[rgba(245,89,89,0.32)] bg-[rgba(245,89,89,0.14)] text-[var(--color-danger)] hover:bg-[rgba(245,89,89,0.2)]',
};

export function buttonStyles({ tone = 'primary', block = false }: Pick<ButtonProps, 'tone' | 'block'>) {
  return cx(
    'inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-semibold tracking-[-0.02em] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] disabled:cursor-not-allowed disabled:opacity-50',
    block && 'w-full',
    toneStyles[tone],
  );
}

export function Button({
  children,
  className,
  tone = 'primary',
  block = false,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button className={cx(buttonStyles({ tone, block }), className)} type={type} {...props}>
      {children}
    </button>
  );
}
