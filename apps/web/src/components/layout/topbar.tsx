import { Badge } from '@vowgrid/ui';
import type { IntentResponse } from '@vowgrid/contracts';
import type { IntegrationState } from '@/lib/vowgrid/repository';
import { CommandBar } from './command-bar';

export function Topbar({
  integration,
  intents,
}: {
  integration: IntegrationState;
  intents: IntentResponse[];
}) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <CommandBar intents={intents} />
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={integration.mode === 'live' ? 'mint' : 'warning'}>
          {integration.mode === 'live' ? 'Live API' : 'Provisional data'}
        </Badge>
        <Badge tone="neutral">Control plane</Badge>
      </div>
    </header>
  );
}
