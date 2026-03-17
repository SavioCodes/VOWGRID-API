import { Badge } from '@vowgrid/ui';
import type { BillingSubscriptionStatus } from '@vowgrid/contracts';
import { getBillingStatusTone } from '@/lib/vowgrid/billing';

const labels: Record<BillingSubscriptionStatus, string> = {
  trialing: 'Trialing',
  active: 'Active',
  past_due: 'Past due',
  paused: 'Paused',
  canceled: 'Canceled',
  expired: 'Expired',
  incomplete: 'Incomplete',
};

export function BillingStatusBadge({ status }: { status: BillingSubscriptionStatus }) {
  return <Badge tone={getBillingStatusTone(status)}>{labels[status]}</Badge>;
}
