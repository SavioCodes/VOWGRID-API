import { Badge, Button } from '@vowgrid/ui';
import type { IntentResponse } from '@vowgrid/contracts';
import type { IntegrationState } from '@/lib/vowgrid/repository';
import { logoutAction } from '@/lib/vowgrid/auth-actions';
import { CommandBar } from './command-bar';

export function Topbar({
  integration,
  intents,
  currentUser,
}: {
  integration: IntegrationState;
  intents: IntentResponse[];
  currentUser: {
    name: string;
    email: string;
    role: string;
  };
}) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <CommandBar intents={intents} />
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={integration.mode === 'live' ? 'mint' : 'warning'}>
          {integration.mode === 'live' ? 'Live session' : 'Preview mode'}
        </Badge>
        <div className="rounded-full border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-right">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">{currentUser.name}</p>
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
            {currentUser.role} · {currentUser.email}
          </p>
        </div>
        <form action={logoutAction}>
          <Button tone="ghost" type="submit">
            Log out
          </Button>
        </form>
      </div>
    </header>
  );
}
