'use client';

import { Button, Card, CardContent } from '@vowgrid/ui';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[900px] items-center justify-center px-4 py-10">
      <Card className="w-full">
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-warning)]">
              Error state
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
              The trust surface could not finish loading.
            </h1>
            <p className="text-sm leading-6 text-[var(--color-text-secondary)]">{error.message}</p>
          </div>
          <Button onClick={reset}>Try again</Button>
        </CardContent>
      </Card>
    </div>
  );
}
