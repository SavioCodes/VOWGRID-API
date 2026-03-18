import { NextResponse } from 'next/server';
import { exportWorkspaceData } from '@/lib/vowgrid/repository';

export async function GET() {
  const exported = await exportWorkspaceData();
  const filename = `vowgrid-workspace-export-${exported.workspace.slug}.json`;

  return new NextResponse(JSON.stringify(exported, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
