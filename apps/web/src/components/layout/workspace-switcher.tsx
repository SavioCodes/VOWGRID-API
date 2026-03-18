import { Badge, Button } from '@vowgrid/ui';
import type { IntegrationState } from '@/lib/vowgrid/repository';
import { switchWorkspaceAction } from '@/lib/vowgrid/auth-actions';

export function WorkspaceSwitcher({
  workspaceName,
  workspaceId,
  currentUser,
  availableWorkspaces,
  integration,
}: {
  workspaceName: string;
  workspaceId: string;
  currentUser: {
    name: string;
    role: string;
  };
  availableWorkspaces: Array<{
    workspaceId: string;
    name: string;
    slug: string;
    role: string;
    status: string;
    isDefault: boolean;
    disabledAt: string | null;
  }>;
  integration: IntegrationState;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{workspaceName}</p>
          <p className="mono text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
            {workspaceId}
          </p>
        </div>
        <Badge tone={integration.mode === 'live' ? 'mint' : 'warning'}>
          {integration.mode === 'live' ? 'Live' : 'Preview'}
        </Badge>
      </div>
      <div className="mt-4 rounded-[20px] border border-[var(--color-border)] bg-[rgba(7,11,22,0.72)] px-4 py-3">
        <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
          Signed in as
        </p>
        <p className="mt-2 text-sm font-medium text-[var(--color-text-primary)]">
          {currentUser.name}
        </p>
        <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
          {currentUser.role}
        </p>
      </div>
      {availableWorkspaces.length > 1 ? (
        <div className="mt-4 space-y-3">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
            Available workspaces
          </p>
          <div className="space-y-2">
            {availableWorkspaces.map((workspace) => (
              <form key={workspace.workspaceId} action={switchWorkspaceAction}>
                <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                <Button
                  type="submit"
                  block
                  tone={workspace.workspaceId === workspaceId ? 'secondary' : 'ghost'}
                  disabled={workspace.workspaceId === workspaceId || workspace.status !== 'active'}
                >
                  {workspace.name} · {workspace.role}
                </Button>
              </form>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-[var(--color-text-secondary)]">
          This account currently has access to a single workspace.
        </p>
      )}
    </div>
  );
}
