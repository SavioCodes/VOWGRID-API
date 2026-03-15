'use client';

import { useState } from 'react';
import { Button, Card, CardContent, Modal } from '@vowgrid/ui';

export function DangerZone() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card className="border-[rgba(245,89,89,0.18)]">
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-danger)]">Danger action modal</p>
            <h3 className="text-xl font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
              Reset local integration context
            </h3>
            <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
              This demo action does not hit the backend. It exists to show how destructive operator affordances should be framed in the product.
            </p>
          </div>
          <Button tone="danger" onClick={() => setOpen(true)}>
            Open danger modal
          </Button>
        </CardContent>
      </Card>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        tone="danger"
        title="Reset local integration context?"
        description="This clears only the web app's local context assumptions. It does not rotate API keys, revoke access, or mutate backend state."
        actions={
          <>
            <Button tone="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button tone="danger" onClick={() => setOpen(false)}>
              Understood
            </Button>
          </>
        }
      />
    </>
  );
}
