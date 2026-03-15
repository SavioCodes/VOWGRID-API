import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@vowgrid/ui';
import type { AuditEventResponse } from '@vowgrid/contracts';
import { compactId, formatShortDate } from '@/lib/vowgrid/format';
import { titleFromSlug } from '@/lib/vowgrid/status';

export function AuditEventTable({ events }: { events: AuditEventResponse[] }) {
  return (
    <Table>
      <TableHead>
        <tr>
          <TableHeaderCell>Action</TableHeaderCell>
          <TableHeaderCell>Entity</TableHeaderCell>
          <TableHeaderCell>Actor</TableHeaderCell>
          <TableHeaderCell>When</TableHeaderCell>
        </tr>
      </TableHead>
      <TableBody>
        {events.map((event) => (
          <TableRow key={event.id}>
            <TableCell>
              <div className="space-y-1">
                <p className="font-medium text-[var(--color-text-primary)]">{titleFromSlug(event.action)}</p>
                <p className="mono text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
                  {event.action}
                </p>
              </div>
            </TableCell>
            <TableCell>
              {event.entityType === 'intent' ? (
                <Link className="font-medium text-[var(--color-accent-soft)]" href={`/app/intents/${event.entityId}`}>
                  {compactId(event.entityId)}
                </Link>
              ) : (
                compactId(event.entityId)
              )}
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                <p className="font-medium text-[var(--color-text-primary)]">{compactId(event.actorId)}</p>
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">{event.actorType}</p>
              </div>
            </TableCell>
            <TableCell className="mono text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
              {formatShortDate(event.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
