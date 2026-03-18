import { Badge, Card, CardContent } from '@vowgrid/ui';
import { ApiKeyManager } from '@/components/settings/api-key-manager';
import { InviteManager } from '@/components/settings/invite-manager';
import { MemberManager } from '@/components/settings/member-manager';
import { IntegrationBanner } from '@/components/vowgrid/integration-banner';
import { PageHeader } from '@/components/vowgrid/page-header';
import {
  getWorkspaceSnapshot,
  listWorkspaceApiKeys,
  listWorkspaceInvites,
  listWorkspaceMembers,
} from '@/lib/vowgrid/repository';

export default async function SettingsPage() {
  const snapshot = await getWorkspaceSnapshot();
  const isWorkspaceAdmin = ['owner', 'admin'].includes(snapshot.currentUser.role);
  const [members, apiKeys, invites] = isWorkspaceAdmin
    ? await Promise.all([listWorkspaceMembers(), listWorkspaceApiKeys(), listWorkspaceInvites()])
    : [[], [], []];
  const internalUsersMetric =
    snapshot.billingAccount?.usage.metrics.find((metric) => metric.key === 'internal_users') ??
    null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Keep session auth, workspace access, and machine credentials explicit."
        description="This surface is now the real admin layer for a single workspace: session-backed human auth, direct member management, and full-scope API keys for trusted automation."
      />
      <IntegrationBanner integration={snapshot.integration} />
      <section className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">
                Authentication
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
                Session-backed operators
              </h2>
            </div>
            <div className="space-y-3 text-sm leading-6 text-[var(--color-text-secondary)]">
              <p>
                Dashboard pages use an HttpOnly session cookie on the web app instead of a static
                environment API key.
              </p>
              <p>
                Disabled members lose active sessions immediately and cannot sign back in until an
                owner or admin re-enables them.
              </p>
              <p>
                Programmatic clients still authenticate directly with an{' '}
                <span className="mono">X-Api-Key</span> header.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">
                Workspace identity
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
                Single-workspace truth
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Badge tone={snapshot.integration.mode === 'live' ? 'mint' : 'warning'}>
                {snapshot.integration.mode}
              </Badge>
              <Badge tone="neutral">{snapshot.workspaceName}</Badge>
            </div>
            <div className="space-y-3 text-sm leading-6 text-[var(--color-text-secondary)]">
              <p>
                Signed-in user:{' '}
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {snapshot.currentUser.name}
                </span>{' '}
                ({snapshot.currentUser.role})
              </p>
              <p>
                This account currently sees {snapshot.availableWorkspaces.length} workspace
                {snapshot.availableWorkspaces.length === 1 ? '' : 's'} in the session workspace
                switcher.
              </p>
              {snapshot.integration.notes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">
                Billing and provider
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
                Capacity posture
              </h2>
            </div>
            <div className="space-y-3 text-sm leading-6 text-[var(--color-text-secondary)]">
              <p>
                Internal user capacity is enforced from the workspace billing entitlements and now
                gates direct member creation or re-enable actions.
              </p>
              <p>
                The full billing surface lives at <span className="mono">/app/billing</span>,
                including trial state, usage meters, and Enterprise contact posture.
              </p>
              <p>
                Mercado Pago remains isolated as the payment provider layer, with missing setup
                called out explicitly instead of hidden behind fake success states.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {isWorkspaceAdmin ? (
        <>
          <MemberManager
            members={members}
            currentUserId={snapshot.currentUser.id}
            internalUsersMetric={internalUsersMetric}
          />
          <InviteManager invites={invites} />
          <ApiKeyManager apiKeys={apiKeys} />
        </>
      ) : (
        <Card>
          <CardContent className="space-y-3">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">
              Workspace admin required
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
              Member and API key management are limited to owners and admins
            </h2>
            <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
              Your current role is <span className="mono">{snapshot.currentUser.role}</span>. You
              can still inspect the rest of the control plane, but access changes and machine
              credentials stay behind admin-only routes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
