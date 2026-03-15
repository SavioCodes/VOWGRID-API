import type { ReactNode } from 'react';
import { Badge } from './badge';
import { Card, CardContent } from './card';
import { cx } from '../lib/cx';

interface MetricCardProps {
  label: string;
  value: string;
  trend?: string;
  tone?: 'accent' | 'mint' | 'warning' | 'danger';
  children?: ReactNode;
}

const accentMap = {
  accent: 'from-[rgba(79,124,255,0.24)] to-transparent',
  mint: 'from-[rgba(46,211,183,0.22)] to-transparent',
  warning: 'from-[rgba(245,185,66,0.22)] to-transparent',
  danger: 'from-[rgba(245,89,89,0.22)] to-transparent',
};

export function MetricCard({ label, value, trend, tone = 'accent', children }: MetricCardProps) {
  return (
    <Card className={cx('relative overflow-hidden')}>
      <div className={cx('pointer-events-none absolute inset-0 bg-linear-to-br', accentMap[tone])} />
      <CardContent className="relative space-y-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-dim)]">{label}</p>
          {trend ? <Badge tone={tone === 'mint' ? 'mint' : tone}>{trend}</Badge> : null}
        </div>
        <div className="space-y-2">
          <p className="text-3xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">{value}</p>
          {children ? <div className="text-sm text-[var(--color-text-secondary)]">{children}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}
