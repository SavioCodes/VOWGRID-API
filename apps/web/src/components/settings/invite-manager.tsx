'use client';

import { useRef, useState, useTransition } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@vowgrid/ui';
import type { WorkspaceInviteResponse } from '@vowgrid/contracts';
import { useRouter } from 'next/navigation';
import {
  createInviteAction,
  revokeInviteAction,
  type InviteActionResult,
} from '@/app/(app)/app/settings/actions';
import { CsrfTokenField } from '@/components/security/csrf-token-field';
import { useCsrfToken } from '@/components/security/csrf-provider';

const editableRoles = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
] as const;

function formatDate(value: string | null) {
  if (!value) {
    return 'Not yet';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getStatusTone(status: WorkspaceInviteResponse['status']) {
  switch (status) {
    case 'accepted':
      return 'mint' as const;
    case 'revoked':
    case 'expired':
      return 'warning' as const;
    default:
      return 'accent' as const;
  }
}

export function InviteManager({ invites }: { invites: WorkspaceInviteResponse[] }) {
  const router = useRouter();
  const csrfToken = useCsrfToken();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [activeInviteId, setActiveInviteId] = useState<string | null>(null);
  const [result, setResult] = useState<InviteActionResult | null>(null);

  const handleCreate = async (formData: FormData) => {
    setActiveInviteId('create');
    const next = await createInviteAction(formData);
    setResult(next);
    setActiveInviteId(null);

    if (next.ok) {
      formRef.current?.reset();
    }
  };

  const handleRevoke = (inviteId: string) => {
    const confirmed = window.confirm('Revoke this workspace invite?');
    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      setActiveInviteId(inviteId);
      const next = await revokeInviteAction(inviteId, csrfToken);
      setResult(next);
      setActiveInviteId(null);

      if (next.ok) {
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">
              Invites
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
              Workspace invitations
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-[var(--color-text-secondary)]">
              Invite existing or future users into this workspace. Accepted invites can create a new
              account or attach a new workspace membership to an existing user.
            </p>
          </div>

          {result ? (
            <div
              className={`rounded-[22px] border p-4 text-sm leading-6 ${result.ok ? 'border-[rgba(46,211,183,0.28)] bg-[rgba(46,211,183,0.08)] text-[var(--color-text-primary)]' : 'border-[rgba(245,89,89,0.28)] bg-[rgba(245,89,89,0.08)] text-[var(--color-text-primary)]'}`}
            >
              <p>{result.message}</p>
              {result.inviteUrl ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
                    One-time invite link
                  </p>
                  <a
                    data-testid="invite-url"
                    className="mono inline-flex break-all text-[var(--color-accent)] underline decoration-[rgba(79,124,255,0.4)] underline-offset-4"
                    href={result.inviteUrl}
                  >
                    {result.inviteUrl}
                  </a>
                </div>
              ) : null}
            </div>
          ) : null}

          <form
            ref={formRef}
            action={(formData) => {
              startTransition(async () => {
                await handleCreate(formData);
              });
            }}
            className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_auto]"
          >
            <CsrfTokenField />
            <Input name="email" type="email" placeholder="invitee@company.com" required />
            <Select name="role" defaultValue="member">
              {editableRoles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </Select>
            <Button type="submit" block disabled={pending && activeInviteId === 'create'}>
              {pending && activeInviteId === 'create' ? 'Sending...' : 'Send invite'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Email</TableHeaderCell>
            <TableHeaderCell>Role</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Expires</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {invites.length > 0 ? (
            invites.map((invite) => (
              <TableRow key={invite.id}>
                <TableCell>{invite.email}</TableCell>
                <TableCell className="capitalize">{invite.role}</TableCell>
                <TableCell>
                  <Badge tone={getStatusTone(invite.status)}>{invite.status}</Badge>
                </TableCell>
                <TableCell>{formatDate(invite.expiresAt)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    tone="ghost"
                    disabled={!csrfToken || invite.status !== 'pending' || pending}
                    onClick={() => handleRevoke(invite.id)}
                  >
                    {pending && activeInviteId === invite.id ? 'Working...' : 'Revoke'}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5}>
                No workspace invites exist yet. Create one above to add another operator without
                manually provisioning credentials first.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
