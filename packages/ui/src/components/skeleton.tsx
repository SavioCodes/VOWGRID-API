import { cx } from '../lib/cx';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-2xl bg-[rgba(247,249,252,0.06)]', className)} />;
}
