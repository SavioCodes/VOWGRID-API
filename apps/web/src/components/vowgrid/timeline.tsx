import { Badge, Card, CardContent } from '@vowgrid/ui';
import { formatShortDate } from '@/lib/vowgrid/format';

export interface TimelineItem {
  title: string;
  detail: string;
  timestamp?: string | null;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'mint';
  meta?: string;
}

export function Timeline({ title, items }: { title: string; items: TimelineItem[] }) {
  return (
    <Card>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
            {title}
          </h3>
          <Badge tone="neutral">{items.length} events</Badge>
        </div>
        <ol className="space-y-5">
          {items.map((item, index) => (
            <li key={`${item.title}-${index}`} className="relative pl-8">
              <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full bg-[var(--color-accent)] shadow-[0_0_0_6px_rgba(79,124,255,0.12)]" />
              {index < items.length - 1 ? (
                <span className="absolute left-[5px] top-5 h-[calc(100%+0.7rem)] w-px bg-[var(--color-border)]" />
              ) : null}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {item.title}
                  </p>
                  {item.meta ? <Badge tone={item.tone ?? 'accent'}>{item.meta}</Badge> : null}
                  {item.timestamp ? (
                    <span className="mono text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
                      {formatShortDate(item.timestamp)}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
                  {item.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
