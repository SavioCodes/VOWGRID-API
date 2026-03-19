import { Card, CardContent } from '@vowgrid/ui';
import type { ConnectorResponse } from '@vowgrid/contracts';
import { RollbackSupportBadge } from './badges';

export function ConnectorCard({ connector }: { connector: ConnectorResponse }) {
  return (
    <Card className="h-full">
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-dim)]">
              {connector.type}
            </p>
            <h3 className="text-xl font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
              {connector.name}
            </h3>
          </div>
          <RollbackSupportBadge value={connector.rollbackSupport} />
        </div>
        <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
          {connector.description ?? 'No connector description is available.'}
        </p>
        {connector.hasConfig ? (
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
            {connector.configEncrypted ? 'Encrypted config stored at rest' : 'Legacy config stored'}
          </p>
        ) : (
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
            No connector secrets stored
          </p>
        )}
      </CardContent>
    </Card>
  );
}
