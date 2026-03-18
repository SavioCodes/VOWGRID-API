'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { cx } from '../lib/cx';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  tone?: 'default' | 'danger';
  actions?: ReactNode;
  children?: ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  tone = 'default',
  actions,
  children,
}: ModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(3,7,17,0.72)] px-4 backdrop-blur-sm">
      <div aria-hidden="true" className="absolute inset-0" onClick={onClose} />
      <div
        aria-modal="true"
        role="dialog"
        className={cx(
          'relative w-full max-w-lg rounded-[28px] border border-[var(--color-border-strong)] bg-[linear-gradient(180deg,rgba(17,24,41,0.98),rgba(11,16,32,0.97))] p-6 shadow-[0_30px_90px_rgba(3,7,17,0.5)]',
          tone === 'danger' && 'border-[rgba(245,89,89,0.32)]',
        )}
      >
        <div className="space-y-2">
          <h3 className="text-xl font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
            {title}
          </h3>
          {description ? (
            <div className="text-sm leading-6 text-[var(--color-text-secondary)]">
              {description}
            </div>
          ) : null}
        </div>
        {children ? <div className="mt-5">{children}</div> : null}
        {actions ? <div className="mt-6 flex flex-wrap justify-end gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
