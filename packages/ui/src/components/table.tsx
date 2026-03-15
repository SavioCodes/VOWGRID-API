import type { HTMLAttributes, TableHTMLAttributes } from 'react';
import { cx } from '../lib/cx';

export function Table({ className, children, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[var(--color-border)]">
      <table className={cx('min-w-full border-collapse text-left text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cx(
        'bg-[rgba(247,249,252,0.02)] text-xs uppercase tracking-[0.14em] text-[var(--color-text-dim)]',
        className,
      )}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TableBody({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cx('divide-y divide-[var(--color-border)]', className)} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ className, children, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cx('transition hover:bg-[rgba(79,124,255,0.06)]', className)} {...props}>
      {children}
    </tr>
  );
}

export function TableCell({ className, children, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cx('px-4 py-3 align-top text-[var(--color-text-secondary)]', className)} {...props}>
      {children}
    </td>
  );
}

export function TableHeaderCell({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cx('px-4 py-3 font-medium', className)} {...props}>
      {children}
    </th>
  );
}
