'use client';

import { useRef, useState, useTransition } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Modal,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@vowgrid/ui';
import type { UsageMetricResponse, WorkspaceMemberResponse } from '@vowgrid/contracts';
import { useRouter } from 'next/navigation';
import {
  anonymizeMemberAction,
  createMemberAction,
  disableMemberAction,
  enableMemberAction,
  type MemberActionResult,
  updateMemberAction,
} from '@/app/(app)/app/settings/actions';

const editableRoles = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
] as const;

function formatDate(value: string | null) {
  if (!value) {
    return 'Never';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getStatusTone(status: WorkspaceMemberResponse['status']) {
  return status === 'active' ? 'mint' : 'warning';
}

function getUsageTone(status: UsageMetricResponse['status']) {
  switch (status) {
    case 'blocked':
      return 'danger' as const;
    case 'warning':
      return 'warning' as const;
    default:
      return 'neutral' as const;
  }
}

function formatUsage(metric: UsageMetricResponse | null) {
  if (!metric) {
    return 'Capacity unavailable';
  }

  if (metric.limit === null) {
    return `${metric.used} users`;
  }

  return `${metric.used} / ${metric.limit} users`;
}

export function MemberManager({
  members,
  currentUserId,
  internalUsersMetric,
}: {
  members: WorkspaceMemberResponse[];
  currentUserId: string;
  internalUsersMetric: UsageMetricResponse | null;
}) {
  const router = useRouter();
  const createFormRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<MemberActionResult | null>(null);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<WorkspaceMemberResponse | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'member' | 'viewer'>('member');

  const openEditModal = (member: WorkspaceMemberResponse) => {
    setEditingMember(member);
    setEditName(member.name);
    setEditRole(member.role === 'owner' ? 'member' : member.role);
  };

  const closeEditModal = () => {
    setEditingMember(null);
    setEditName('');
    setEditRole('member');
  };

  const handleCreate = async (formData: FormData) => {
    setActiveMemberId('create');
    const next = await createMemberAction(formData);
    setResult(next);
    setActiveMemberId(null);

    if (next.ok) {
      createFormRef.current?.reset();
      router.refresh();
    }
  };

  const handleUpdate = async () => {
    if (!editingMember) {
      return;
    }

    const formData = new FormData();
    formData.set('name', editName);
    formData.set('role', editRole);

    setActiveMemberId(editingMember.id);
    const next = await updateMemberAction(editingMember.id, formData);
    setResult(next);
    setActiveMemberId(null);

    if (next.ok) {
      closeEditModal();
      router.refresh();
    }
  };

  const handleStatusChange = (member: WorkspaceMemberResponse) => {
    const action = member.status === 'active' ? disableMemberAction : enableMemberAction;
    const confirmation = window.confirm(
      member.status === 'active'
        ? `Disable ${member.name} and revoke their existing sessions?`
        : `Re-enable ${member.name} and let them sign in again?`,
    );

    if (!confirmation) {
      return;
    }

    startTransition(async () => {
      setActiveMemberId(member.id);
      const next = await action(member.id);
      setResult(next);
      setActiveMemberId(null);

      if (next.ok) {
        router.refresh();
      }
    });
  };

  const handleAnonymize = (member: WorkspaceMemberResponse) => {
    const confirmation = window.confirm(
      `Anonymize ${member.name}? This will redact email, name, password, OAuth links, and recovery tokens while preserving history.`,
    );

    if (!confirmation) {
      return;
    }

    startTransition(async () => {
      setActiveMemberId(member.id);
      const next = await anonymizeMemberAction(member.id);
      setResult(next);
      setActiveMemberId(null);

      if (next.ok) {
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">
                Member management
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
                Workspace members
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-[var(--color-text-secondary)]">
                Add workspace users directly, adjust their role, and suspend access without deleting
                history. Invites now exist as a separate path when you do not want to provision the
                account inline.
              </p>
            </div>
            {internalUsersMetric ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={getUsageTone(internalUsersMetric.status)}>
                  {formatUsage(internalUsersMetric)}
                </Badge>
                {internalUsersMetric.status === 'warning' ? (
                  <Badge tone="warning">Near plan limit</Badge>
                ) : null}
                {internalUsersMetric.status === 'blocked' ? (
                  <Badge tone="danger">Hard limit reached</Badge>
                ) : null}
              </div>
            ) : null}
          </div>

          {result ? (
            <div
              className={`rounded-[22px] border p-4 text-sm leading-6 ${result.ok ? 'border-[rgba(46,211,183,0.28)] bg-[rgba(46,211,183,0.08)] text-[var(--color-text-primary)]' : 'border-[rgba(245,89,89,0.28)] bg-[rgba(245,89,89,0.08)] text-[var(--color-text-primary)]'}`}
            >
              {result.message}
            </div>
          ) : null}

          <form
            ref={createFormRef}
            action={(formData) => {
              startTransition(async () => {
                await handleCreate(formData);
              });
            }}
            className="grid gap-3 lg:grid-cols-[1.1fr_1fr_1fr_0.8fr_auto]"
          >
            <Input name="name" placeholder="Priya Shah" required />
            <Input name="email" type="email" placeholder="priya@company.com" required />
            <Input name="password" type="password" placeholder="Initial password" required />
            <Select name="role" defaultValue="member">
              {editableRoles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </Select>
            <Button type="submit" block disabled={pending && activeMemberId === 'create'}>
              {pending && activeMemberId === 'create' ? 'Adding...' : 'Add member'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Member</TableHeaderCell>
            <TableHeaderCell>Role</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Last login</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {members.map((member) => {
            const isCurrentUser = member.id === currentUserId;
            const isOwner = member.role === 'owner';
            const canEdit = !isOwner;
            const canToggle = !isOwner && !isCurrentUser;
            const canAnonymize = !isOwner && member.status === 'disabled';

            return (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[var(--color-text-primary)]">{member.name}</p>
                      {isCurrentUser ? <Badge tone="neutral">You</Badge> : null}
                      {isOwner ? <Badge tone="accent">Reserved owner</Badge> : null}
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)]">{member.email}</p>
                  </div>
                </TableCell>
                <TableCell className="capitalize">{member.role}</TableCell>
                <TableCell>
                  <Badge tone={getStatusTone(member.status)}>{member.status}</Badge>
                </TableCell>
                <TableCell>{formatDate(member.lastLoginAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      tone="secondary"
                      disabled={!canEdit || pending}
                      onClick={() => openEditModal(member)}
                    >
                      Edit
                    </Button>
                    <Button
                      tone={member.status === 'active' ? 'ghost' : 'secondary'}
                      disabled={!canToggle || pending}
                      onClick={() => handleStatusChange(member)}
                    >
                      {pending && activeMemberId === member.id
                        ? 'Working...'
                        : member.status === 'active'
                          ? 'Disable'
                          : 'Enable'}
                    </Button>
                    <Button
                      tone="ghost"
                      disabled={!canAnonymize || pending}
                      onClick={() => handleAnonymize(member)}
                    >
                      {pending && activeMemberId === member.id ? 'Working...' : 'Anonymize'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Modal
        open={editingMember !== null}
        onClose={closeEditModal}
        title={editingMember ? `Edit ${editingMember.name}` : 'Edit member'}
        description="Adjust the display name and workspace role for this member. Owner role stays reserved to the initial signup flow."
        actions={
          <>
            <Button tone="ghost" onClick={closeEditModal}>
              Cancel
            </Button>
            <Button
              disabled={editingMember === null || (pending && activeMemberId === editingMember?.id)}
              onClick={() => {
                startTransition(async () => {
                  await handleUpdate();
                });
              }}
            >
              {pending && activeMemberId === editingMember?.id ? 'Saving...' : 'Save changes'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--color-text-primary)]">Name</span>
            <Input value={editName} onChange={(event) => setEditName(event.target.value)} />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--color-text-primary)]">Role</span>
            <Select
              value={editRole}
              onChange={(event) => setEditRole(event.target.value as 'admin' | 'member' | 'viewer')}
            >
              {editableRoles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </Select>
          </label>
        </div>
      </Modal>
    </div>
  );
}
