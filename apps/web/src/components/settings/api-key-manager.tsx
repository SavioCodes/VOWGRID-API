'use client';

import { useRef, useState, useTransition } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@vowgrid/ui';
import type { WorkspaceApiKeyResponse } from '@vowgrid/contracts';
import { useRouter } from 'next/navigation';
import {
  createApiKeyAction,
  revokeApiKeyAction,
  rotateApiKeyAction,
  type ApiKeyActionResult,
} from '@/app/(app)/app/settings/actions';
import { CsrfTokenField } from '@/components/security/csrf-token-field';
import { useCsrfToken } from '@/components/security/csrf-provider';

function formatDate(value: string | null) {
  if (!value) {
    return 'Never';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getStatusTone(status: WorkspaceApiKeyResponse['status']) {
  switch (status) {
    case 'active':
      return 'mint' as const;
    case 'expired':
      return 'warning' as const;
    case 'revoked':
      return 'danger' as const;
  }
}

export function ApiKeyManager({ apiKeys }: { apiKeys: WorkspaceApiKeyResponse[] }) {
  const router = useRouter();
  const csrfToken = useCsrfToken();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ApiKeyActionResult | null>(null);
  const [activeKeyId, setActiveKeyId] = useState<string | null>(null);

  const handleCreate = async (formData: FormData) => {
    setActiveKeyId('create');
    const next = await createApiKeyAction(formData);
    setResult(next);
    setActiveKeyId(null);
    if (next.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  };

  const handleRotate = (apiKeyId: string) => {
    startTransition(async () => {
      setActiveKeyId(apiKeyId);
      const next = await rotateApiKeyAction(apiKeyId, csrfToken);
      setResult(next);
      setActiveKeyId(null);
      if (next.ok) {
        router.refresh();
      }
    });
  };

  const handleRevoke = (apiKeyId: string) => {
    startTransition(async () => {
      setActiveKeyId(apiKeyId);
      const next = await revokeApiKeyAction(apiKeyId, csrfToken);
      setResult(next);
      setActiveKeyId(null);
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
              Programmatic access
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
              Workspace API keys
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-[var(--color-text-secondary)]">
              Create, rotate, and revoke machine credentials without leaving the dashboard. Full
              secrets are only shown once at creation or rotation time.
            </p>
          </div>

          {result ? (
            <div
              className={`rounded-[22px] border p-4 text-sm leading-6 ${result.ok ? 'border-[rgba(46,211,183,0.28)] bg-[rgba(46,211,183,0.08)] text-[var(--color-text-primary)]' : 'border-[rgba(245,89,89,0.28)] bg-[rgba(245,89,89,0.08)] text-[var(--color-text-primary)]'}`}
            >
              <p className="font-medium">{result.message}</p>
              {result.revealedApiKey ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
                    {result.recordName ?? 'API key'}
                  </p>
                  <pre className="overflow-x-auto rounded-[18px] border border-[var(--color-border)] bg-[rgba(7,11,22,0.82)] px-4 py-3 text-sm text-[var(--color-text-primary)]">
                    {result.revealedApiKey}
                  </pre>
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
            className="grid gap-3 md:grid-cols-[1.3fr_1fr_auto]"
          >
            <CsrfTokenField />
            <Input name="name" placeholder="Production automation key" required />
            <Input name="expiresAt" type="datetime-local" />
            <Button type="submit" block disabled={pending && activeKeyId === 'create'}>
              {pending && activeKeyId === 'create' ? 'Creating...' : 'Create API key'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Prefix</TableHeaderCell>
            <TableHeaderCell>Created</TableHeaderCell>
            <TableHeaderCell>Last used</TableHeaderCell>
            <TableHeaderCell>Expires</TableHeaderCell>
            <TableHeaderCell>Revoked</TableHeaderCell>
            <TableHeaderCell className="text-right">Actions</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {apiKeys.map((apiKey) => (
            <TableRow key={apiKey.id}>
              <TableCell>
                <p className="font-medium text-[var(--color-text-primary)]">{apiKey.name}</p>
              </TableCell>
              <TableCell>
                <Badge tone={getStatusTone(apiKey.status)}>{apiKey.status}</Badge>
              </TableCell>
              <TableCell>
                <span className="mono text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
                  {apiKey.keyPrefix}
                </span>
              </TableCell>
              <TableCell>{formatDate(apiKey.createdAt)}</TableCell>
              <TableCell>{formatDate(apiKey.lastUsedAt)}</TableCell>
              <TableCell>{formatDate(apiKey.expiresAt)}</TableCell>
              <TableCell>{formatDate(apiKey.revokedAt)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    tone="secondary"
                    disabled={!csrfToken || pending || apiKey.status === 'revoked'}
                    onClick={() => handleRotate(apiKey.id)}
                  >
                    {pending && activeKeyId === apiKey.id ? 'Working...' : 'Rotate'}
                  </Button>
                  <Button
                    tone="ghost"
                    disabled={!csrfToken || pending || apiKey.status === 'revoked'}
                    onClick={() => handleRevoke(apiKey.id)}
                  >
                    Revoke
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {apiKeys.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8}>
                No workspace API keys exist yet. Create one above for agents, CI tasks, or trusted
                automation.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
