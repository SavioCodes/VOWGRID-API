import { Card, CardContent, CardHeader } from '@vowgrid/ui';

export function PayloadViewer({
  title,
  description,
  payload,
}: {
  title: string;
  description: string;
  payload: unknown;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
            {title}
          </h3>
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">{description}</p>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <pre className="mono overflow-x-auto rounded-[24px] border border-[var(--color-border)] bg-[rgba(6,10,20,0.86)] p-4 text-xs leading-6 text-[var(--color-text-secondary)]">
          {JSON.stringify(payload, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}
