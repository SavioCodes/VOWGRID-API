import type { ReactNode } from 'react';
import type { WorkspaceSnapshot } from '@/lib/vowgrid/repository';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

export function AppShell({
  snapshot,
  children,
}: {
  snapshot: WorkspaceSnapshot;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1700px] flex-col gap-6 px-4 py-6 lg:flex-row lg:px-6">
      <Sidebar
        workspaceName={snapshot.workspaceName}
        workspaceId={snapshot.workspaceId}
        currentUser={snapshot.currentUser}
        availableWorkspaces={snapshot.availableWorkspaces}
        integration={snapshot.integration}
      />
      <div className="flex-1 space-y-6">
        <Topbar
          integration={snapshot.integration}
          intents={snapshot.intents}
          currentUser={snapshot.currentUser}
        />
        <main className="space-y-6">{children}</main>
      </div>
    </div>
  );
}
