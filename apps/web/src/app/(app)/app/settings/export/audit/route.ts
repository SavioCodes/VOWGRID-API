import { NextResponse } from 'next/server';
import { exportWorkspaceData } from '@/lib/vowgrid/repository';

function escapeCsvCell(value: unknown) {
  const normalized =
    value === null || value === undefined
      ? ''
      : typeof value === 'string'
        ? value
        : JSON.stringify(value);

  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }

  return normalized;
}

export async function GET() {
  const exported = await exportWorkspaceData();
  const rows = [
    ['id', 'createdAt', 'action', 'entityType', 'entityId', 'actorType', 'actorId', 'metadata'],
    ...exported.auditEvents.map((event) => [
      event.id,
      event.createdAt,
      event.action,
      event.entityType,
      event.entityId,
      event.actorType,
      event.actorId,
      event.metadata ?? null,
    ]),
  ];
  const csv = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
  const filename = `vowgrid-audit-export-${exported.workspace.slug}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
