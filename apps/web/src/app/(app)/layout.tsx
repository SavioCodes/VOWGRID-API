import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { getWorkspaceSnapshot } from '@/lib/vowgrid/repository';

export const dynamic = 'force-dynamic';

export default async function ProductLayout({ children }: { children: ReactNode }) {
  const snapshot = await getWorkspaceSnapshot();

  return <AppShell snapshot={snapshot}>{children}</AppShell>;
}
