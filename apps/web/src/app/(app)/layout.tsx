import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { requireCurrentSession } from '@/lib/vowgrid/auth';
import { getWorkspaceSnapshot } from '@/lib/vowgrid/repository';

export const dynamic = 'force-dynamic';

export default async function ProductLayout({ children }: { children: ReactNode }) {
  const session = await requireCurrentSession();
  const snapshot = await getWorkspaceSnapshot(session);

  return <AppShell snapshot={snapshot}>{children}</AppShell>;
}
