'use client';

import Link from 'next/link';
import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Input, Modal } from '@vowgrid/ui';
import type { IntentResponse } from '@vowgrid/contracts';
import { StatusBadge } from '@/components/vowgrid/badges';

interface CommandEntry {
  label: string;
  href: string;
  meta: string;
  intent?: IntentResponse;
}

export function CommandBar({ intents }: { intents: IntentResponse[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const entries = useMemo<CommandEntry[]>(
    () => [
      { label: 'Overview', href: '/app', meta: 'Control plane overview' },
      { label: 'Intents', href: '/app/intents', meta: 'Lifecycle queue' },
      { label: 'Approvals', href: '/app/approvals', meta: 'Human review center' },
      { label: 'Executions', href: '/app/executions', meta: 'Runtime monitoring' },
      { label: 'Policies', href: '/app/policies', meta: 'Policy catalog' },
      { label: 'Connectors', href: '/app/connectors', meta: 'Connector management' },
      { label: 'Audit Trail', href: '/app/audit', meta: 'Queryable audit log' },
      { label: 'Settings', href: '/app/settings', meta: 'Integration and auth status' },
      ...intents.slice(0, 8).map((intent) => ({
        label: intent.title,
        href: `/app/intents/${intent.id}`,
        meta: `${intent.action} · ${intent.environment}`,
        intent,
      })),
    ],
    [intents],
  );

  const filtered = entries.filter((entry) => {
    const haystack = `${entry.label} ${entry.meta}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <>
      <button
        className="flex w-full items-center justify-between rounded-full border border-[var(--color-border)] bg-[rgba(247,249,252,0.03)] px-4 py-2.5 text-sm text-[var(--color-text-secondary)] transition hover:border-[var(--color-border-highlight)] sm:max-w-xs"
        type="button"
        onClick={() => setOpen(true)}
      >
        <span>Search intents, approvals, receipts</span>
        <span className="mono rounded-full border border-[var(--color-border)] px-2 py-1 text-[10px] uppercase tracking-[0.12em]">
          Ctrl K
        </span>
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Command bar"
        description="Jump between workflow surfaces and recent intents."
      >
        <div className="space-y-4">
          <Input
            autoFocus
            placeholder="Search the control plane"
            value={query}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
          />
          <div className="space-y-2">
            {filtered.map((entry) => (
              <Link
                key={`${entry.href}-${entry.label}`}
                href={entry.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-[22px] border border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] px-4 py-3 transition hover:border-[var(--color-border-highlight)] hover:bg-[rgba(79,124,255,0.08)]"
              >
                <div className="space-y-1">
                  <p className="font-medium text-[var(--color-text-primary)]">{entry.label}</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">{entry.meta}</p>
                </div>
                {entry.intent ? <StatusBadge status={entry.intent.status} /> : null}
              </Link>
            ))}
            {filtered.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-[var(--color-border)] px-4 py-6 text-sm text-[var(--color-text-secondary)]">
                No matches. Try an intent title, action, or surface name.
              </div>
            ) : null}
          </div>
        </div>
      </Modal>
    </>
  );
}
