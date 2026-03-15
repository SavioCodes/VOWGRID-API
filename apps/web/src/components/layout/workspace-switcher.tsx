'use client';

import { useState } from 'react';
import { Badge, Button, Modal } from '@vowgrid/ui';
import type { IntegrationState } from '@/lib/vowgrid/repository';

export function WorkspaceSwitcher({
  workspaceName,
  workspaceId,
  integration,
}: {
  workspaceName: string;
  workspaceId: string;
  integration: IntegrationState;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="flex w-full items-center justify-between rounded-[24px] border border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] px-4 py-3 text-left transition hover:border-[var(--color-border-highlight)]"
        onClick={() => setOpen(true)}
        type="button"
      >
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{workspaceName}</p>
          <p className="mono text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">{workspaceId}</p>
        </div>
        <Badge tone={integration.mode === 'live' ? 'mint' : 'warning'}>
          {integration.mode}
        </Badge>
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Workspace selection"
        description="The current backend scopes every request to one workspace per API key. The switcher is ready in the shell, but true multi-workspace switching needs backend route support first."
        actions={<Button tone="secondary" onClick={() => setOpen(false)}>Close</Button>}
      >
        <div className="rounded-[24px] border border-[var(--color-border)] bg-[rgba(7,11,22,0.72)] p-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Active workspace: <span className="font-semibold text-[var(--color-text-primary)]">{workspaceName}</span>
          </p>
          <p className="mono mt-2 text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">{workspaceId}</p>
        </div>
      </Modal>
    </>
  );
}
