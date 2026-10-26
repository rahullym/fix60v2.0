'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { AlertCircle, Inbox, Loader2, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { errorMessage } from '../lib/error-copy';
import { Button } from './button';

export function Card({ children, className }: { children: ReactNode; className?: string }): ReactNode {
  return <section className={cn('rounded-lg border border-border bg-background p-5', className)}>{children}</section>;
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}): ReactNode {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </div>
  );
}

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-muted text-muted',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-destructive/10 text-destructive',
  accent: 'bg-accent-light text-accent',
};

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: BadgeTone }): ReactNode {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', badgeTones[tone])}>
      {children}
    </span>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }): ReactNode {
  return (
    <div role="status" className="flex items-center gap-2 py-10 text-sm text-muted">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }): ReactNode {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <Inbox className="size-8 text-muted" aria-hidden />
      <p className="font-medium text-foreground">{title}</p>
      {body ? <p className="max-w-sm text-sm text-muted">{body}</p> : null}
    </div>
  );
}

/** Layman error text from the error code, with optional retry. */
export function ErrorNotice({ error, onRetry }: { error: unknown; onRetry?: () => void }): ReactNode {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p className="flex-1">{errorMessage(error)}</p>
      {onRetry ? (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/** Modal built on the native <dialog> (focus trap + Esc for free). */
export function Dialog({
  isOpen,
  onClose,
  title,
  children,
  footer,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}): ReactNode {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="dialog-title"
      className="m-auto w-full max-w-lg rounded-lg border border-border bg-background p-0 text-foreground shadow-xl backdrop:bg-rail-deep/50">
      {isOpen ? (
        <div className="flex max-h-[85vh] flex-col">
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 id="dialog-title" className="font-heading text-lg font-semibold">
              {title}
            </h2>
            <button type="button" aria-label="Close" onClick={onClose} className="rounded p-1 text-muted hover:bg-surface-muted">
              <X className="size-4" />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer ? <footer className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</footer> : null}
        </div>
      ) : null}
    </dialog>
  );
}

export function Table({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }): ReactNode {
  return <th className={cn('border-b border-border bg-surface-fog px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted', className)}>{children}</th>;
}

export function Td({ children, className }: { children?: ReactNode; className?: string }): ReactNode {
  return <td className={cn('border-b border-border px-4 py-3 align-top', className)}>{children}</td>;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}): ReactNode {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="mt-3 flex items-center justify-between text-sm text-muted">
      <span>
        {total === 0 ? 'No results' : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
      </span>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

/** Label/value pairs in a two-column grid. */
export function DetailList({ items }: { items: { label: string; value: ReactNode }[] }): ReactNode {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">{item.label}</dt>
          <dd className="mt-0.5 break-words text-foreground">{item.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Small headline number for a detail page. */
export function Stat({ label, value }: { label: string; value: ReactNode }): ReactNode {
  return (
    <div className="rounded-lg border border-border bg-background px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-heading text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
