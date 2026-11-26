'use client';
import { formatDate } from '@/components/shared/format-date';
import { Fragment, useState } from 'react';
import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';
import type { LearnerProfileItem, ProfileItemStatus } from '@/contracts/profile';
import { MAX_PROFILE_TEXT_LENGTH } from '@/schemas/profile';
import { ErrorBanner } from '@/components/shared/ErrorBanner';

const ITEM_STATUS: Record<ProfileItemStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-fill text-ink' },
  improving: { label: 'Improving', className: 'bg-sage-wash text-sage' },
  resolved: { label: 'Resolved', className: 'bg-sage-wash text-sage' },
};

function message(error: unknown) { return error instanceof Error ? error.message : 'The change could not be saved. Please try again.'; }
const iconButton = 'rounded-full p-1.5 text-muted hover:bg-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50';

/** Text and status editor for a new or existing item; `onSubmit` rejects to keep it open with the error. */
export function ItemForm({ initial, onSubmit, onCancel }: {
  initial: { text: string; status: ProfileItemStatus }; onSubmit: (value: { text: string; status: ProfileItemStatus }) => Promise<void>; onCancel: () => void;
}) {
  const [text, setText] = useState(initial.text);
  const [status, setStatus] = useState(initial.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true); setError(null);
    try { await onSubmit({ text: text.trim(), status }); }
    catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }

  return <form onSubmit={e => { e.preventDefault(); void submit(); }} className="flex flex-col gap-2 rounded-panel border border-line bg-wash p-3">
    <fieldset disabled={busy} className="flex min-w-0 flex-col gap-2 disabled:opacity-60">
      <textarea aria-label="Item text" value={text} onChange={e => setText(e.target.value)} rows={2} maxLength={MAX_PROFILE_TEXT_LENGTH} autoFocus className="w-full rounded-panel border border-connector bg-card p-2 text-sm" />
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Status" value={status} onChange={e => setStatus(e.target.value as ProfileItemStatus)} className="rounded-panel border border-connector bg-card px-2 py-1.5 text-sm">
          {Object.entries(ITEM_STATUS).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button type="submit" disabled={!text.trim()} className="rounded-full bg-brand px-4 py-1.5 text-sm font-bold text-card hover:bg-brand-deep disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" onClick={onCancel} className="rounded-full border border-connector bg-card px-4 py-1.5 text-sm font-bold text-ink hover:bg-fill">Cancel</button>
      </div>
    </fieldset>
    {error && <ErrorBanner message={error} />}
  </form>;
}

export function ProfileItemRow({ item, managing, disabled, error, onEdit, onDelete }: {
  item: LearnerProfileItem;
  managing: boolean;
  disabled: boolean;
  error?: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = ITEM_STATUS[item.status];
  const tag = 'rounded-[5px] px-1.5 font-semibold';
  return <>
    <div className="flex items-start justify-between gap-2">
      <p className="min-w-0 wrap-anywhere text-base leading-6 text-ink">{item.text}</p>
      {managing && <div className="flex shrink-0">
        <button id={`edit-${item.id}`} type="button" disabled={disabled} onClick={onEdit}
          aria-label={`Edit observation: ${item.text}`} title="Edit" className={iconButton}><Pencil className="size-3.5" aria-hidden /></button>
        <button id={`delete-${item.id}`} type="button" disabled={disabled} onClick={onDelete}
          aria-label={`Delete observation: ${item.text}`} title="Delete" className={iconButton}><Trash2 className="size-3.5" aria-hidden /></button>
      </div>}
    </div>
    <div className="mt-[3px] flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs leading-[18px] text-muted">
      <span className={`${tag} ${status.className}`}>{status.label}</span>
      {item.source === 'tutor' && <span className={`${tag} bg-fill text-ink`}>Tutor</span>}
      {item.evidence.length > 0 && <span className="ml-1">Seen in</span>}
      {item.evidence.map((evidence, i) => (
        <Fragment key={`${evidence.sessionId}-${i}`}>
          {i > 0 && <span aria-hidden>·</span>}
          <Link href={`/sessions/${evidence.sessionId}`} title={evidence.quote}
            className="whitespace-nowrap text-brand-deep underline decoration-brand-deep/35 underline-offset-2 hover:decoration-current">
            {formatDate(evidence.date)}
          </Link>
        </Fragment>
      ))}
    </div>
    {error && <ErrorBanner message={error} />}
  </>;
}
