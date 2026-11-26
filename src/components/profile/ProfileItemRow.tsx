'use client';
import { formatDate } from '@/components/shared/format-date';
import { useState } from 'react';
import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';
import type { LearnerProfileItem, ProfileItemStatus } from '@/contracts/profile';
import { MAX_PROFILE_TEXT_LENGTH, type ProfileUpdate } from '@/schemas/profile';
import { Badge } from '@/components/shared/Card';
import { ErrorBanner } from '@/components/shared/ErrorBanner';

const ITEM_STATUS: Record<ProfileItemStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700' },
  improving: { label: 'Improving', className: 'bg-blue-100 text-blue-700' },
  resolved: { label: 'Resolved', className: 'bg-emerald-100 text-emerald-700' },
};

function message(error: unknown) { return error instanceof Error ? error.message : 'The change could not be saved. Please try again.'; }
const iconButton = 'rounded-full p-1.5 text-slate-400 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50';

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

  return <form onSubmit={e => { e.preventDefault(); void submit(); }} className="flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50/50 p-3">
    <fieldset disabled={busy} className="flex min-w-0 flex-col gap-2 disabled:opacity-60">
      <textarea aria-label="Item text" value={text} onChange={e => setText(e.target.value)} rows={2} maxLength={MAX_PROFILE_TEXT_LENGTH} autoFocus className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm" />
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Status" value={status} onChange={e => setStatus(e.target.value as ProfileItemStatus)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
          {Object.entries(ITEM_STATUS).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button type="submit" disabled={!text.trim()} className="rounded-full bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" onClick={onCancel} className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">Cancel</button>
      </div>
    </fieldset>
    {error && <ErrorBanner message={error} />}
  </form>;
}

/** One profile item with its status, source and evidence; edits and deletes go through `onSave`. */
export function ProfileItemRow({ item, accent, onSave }: { item: LearnerProfileItem; accent: string; onSave: (changes: ProfileUpdate) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!window.confirm('Delete this item from the learner profile?')) return;
    setBusy(true); setError(null);
    try { await onSave({ deleteItemIds: [item.id] }); }
    catch (err) { setError(message(err)); setBusy(false); }
  }

  if (editing) return <li>
    <ItemForm initial={item} onCancel={() => setEditing(false)}
      onSubmit={async ({ text, status }) => { await onSave({ upsertItems: [{ id: item.id, category: item.category, text, status }] }); setEditing(false); }} />
  </li>;
  const status = ITEM_STATUS[item.status];
  return <li className={`flex flex-col gap-2 border-l-2 pl-3 ${accent} ${busy ? 'opacity-60' : ''}`}>
    <div className="flex items-start justify-between gap-2">
      <p className="pt-0.5 text-sm text-slate-800">{item.text}</p>
      <div className="flex shrink-0">
        <button type="button" disabled={busy} onClick={() => { setEditing(true); setError(null); }} aria-label="Edit item" title="Edit" className={`${iconButton} hover:text-slate-700`}><Pencil className="h-3.5 w-3.5" aria-hidden /></button>
        <button type="button" disabled={busy} onClick={() => void remove()} aria-label="Delete item" title="Delete" className={`${iconButton} hover:text-red-600`}><Trash2 className="h-3.5 w-3.5" aria-hidden /></button>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge className={status.className}>{status.label}</Badge>
      {item.source === 'tutor' && <Badge className="bg-violet-100 text-violet-700">Tutor</Badge>}
      {item.evidence.map((evidence, i) => <Link key={`${evidence.sessionId}-${i}`} href={`/sessions/${evidence.sessionId}`} title={evidence.quote}
        className="rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-600 hover:border-blue-300 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
        {formatDate(evidence.date)}
      </Link>)}
    </div>
    {error && <ErrorBanner message={error} />}
  </li>;
}
