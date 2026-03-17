import { Badge } from '@vowgrid/ui';
import type { IntegrationState } from '@/lib/vowgrid/repository';

export function WorkspaceSwitcher({
  workspaceName,
  workspaceId,
  currentUser,
  integration,
}: {
  workspaceName: string;
  workspaceId: string;
  currentUser: {
    name: string;
    role: string;
  };
  integration: IntegrationState;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{workspaceName}</p>
          <p className="mono text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">{workspaceId}</p>
        </div>
        <Badge tone={integration.mode === 'live' ? 'mint' : 'warning'}>
          {integration.mode === 'live' ? 'Live' : 'Preview'}
        </Badge>
      </div>
      <div className="mt-4 rounded-[20px] border border-[var(--color-border)] bg-[rgba(7,11,22,0.72)] px-4 py-3">
        <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">Signed in as</p>
        <p className="mt-2 text-sm font-medium text-[var(--color-text-primary)]">{currentUser.name}</p>
        <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">{currentUser.role}</p>
      </div>
      <p className="mt-4 text-sm leading-6 text-[var(--color-text-secondary)]">
        Multi-workspace switching stays hidden until membership and switching routes are real.
      </p>
    </div>
  );
}
