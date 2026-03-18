import Link from 'next/link';
import { Badge } from '@vowgrid/ui';
import type { IntegrationState } from '@/lib/vowgrid/repository';
import { WorkspaceSwitcher } from './workspace-switcher';

const navItems = [
  { href: '/app', label: 'Overview', note: 'Executive signal' },
  { href: '/app/intents', label: 'Intents', note: 'Trust workflow queue' },
  { href: '/app/approvals', label: 'Approvals', note: 'Review gates' },
  { href: '/app/executions', label: 'Executions', note: 'Runtime status' },
  { href: '/app/billing', label: 'Billing', note: 'Plans, usage, trial' },
  { href: '/app/policies', label: 'Policies', note: 'Governance rules' },
  { href: '/app/connectors', label: 'Connectors', note: 'Action surfaces' },
  { href: '/app/audit', label: 'Audit trail', note: 'Immutable visibility' },
  { href: '/app/settings', label: 'Settings', note: 'Auth and adapter state' },
];

export function Sidebar({
  workspaceName,
  workspaceId,
  currentUser,
  integration,
}: {
  workspaceName: string;
  workspaceId: string;
  currentUser: {
    name: string;
    role: string;
  };
  integration: IntegrationState;
}) {
  return (
    <aside className="surface-ring flex w-full flex-col gap-8 rounded-[var(--radius-shell)] border border-[var(--color-border)] bg-[rgba(8,13,25,0.84)] p-5 lg:sticky lg:top-6 lg:min-h-[calc(100vh-3rem)] lg:max-w-[310px]">
      <div className="space-y-4">
        <Link href="/" className="space-y-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(79,124,255,0.24)] bg-[rgba(79,124,255,0.14)] text-lg font-semibold text-[var(--color-accent-soft)]">
            VG
          </div>
          <div>
            <p className="text-xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
              VowGrid
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
              Every AI action needs context, permission, and proof.
            </p>
          </div>
        </Link>
        <WorkspaceSwitcher
          workspaceName={workspaceName}
          workspaceId={workspaceId}
          currentUser={currentUser}
          integration={integration}
        />
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between rounded-[24px] border border-transparent px-4 py-3 transition hover:border-[var(--color-border)] hover:bg-[rgba(255,255,255,0.03)]"
          >
            <div className="space-y-1">
              <p className="font-medium text-[var(--color-text-primary)]">{item.label}</p>
              <p className="text-sm text-[var(--color-text-secondary)]">{item.note}</p>
            </div>
            <span className="text-lg text-[var(--color-text-dim)]">›</span>
          </Link>
        ))}
      </nav>
      <div className="mt-auto space-y-4 rounded-[28px] border border-[var(--color-border)] bg-[rgba(247,249,252,0.02)] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">Trust workflow</p>
          <Badge tone="accent">7 stages</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
          {['Propose', 'Simulate', 'Policy', 'Approve', 'Execute', 'Receipt', 'Rollback'].map(
            (step) => (
              <span
                key={step}
                className="rounded-full border border-[var(--color-border)] px-3 py-2 text-center"
              >
                {step}
              </span>
            ),
          )}
        </div>
      </div>
    </aside>
  );
}
