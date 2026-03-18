import Link from 'next/link';
import { Button, Card, CardContent } from '@vowgrid/ui';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[900px] items-center justify-center px-4 py-10">
      <Card className="w-full">
        <CardContent className="space-y-6 text-center">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-accent-soft)]">
              Not found
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
              The requested VowGrid surface does not exist.
            </h1>
            <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
              It may never have been generated, or the current adapter cannot resolve it.
            </p>
          </div>
          <Link href="/app">
            <Button>Return to control plane</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
