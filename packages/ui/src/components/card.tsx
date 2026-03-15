import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cx(
        'rounded-[28px] border border-[var(--color-border)] bg-[linear-gradient(180deg,rgba(18,26,43,0.96),rgba(11,16,32,0.92))] shadow-[0_30px_80px_rgba(4,7,16,0.35)] backdrop-blur',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }: CardProps) {
  return (
    <div className={cx('flex items-start justify-between gap-4 px-6 pt-6', className)} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ children, className, ...props }: CardProps) {
  return (
    <div className={cx('px-6 py-6', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className, ...props }: CardProps) {
  return (
    <div className={cx('px-6 pb-6 pt-2', className)} {...props}>
      {children}
    </div>
  );
}
