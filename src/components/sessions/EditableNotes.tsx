'use client';
import { useState } from 'react';
import { NotebookPen } from 'lucide-react';
import { MAX_TUTOR_NOTES_LENGTH } from '@/contracts/limits';
import { Card } from '@/components/shared/Card';
import { ErrorBanner } from '@/components/shared/ErrorBanner';

/** Tutor notes with an Edit mode; `onSave` rejects to keep the editor open with the error. */
export function EditableNotes({ notes, onSave }: { notes: string; onSave: (notes: string) => Promise<void> }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(value: string) {
    setBusy(true); setError(null);
    try { await onSave(value); setDraft(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'The notes could not be saved. Please try again.'); }
    finally { setBusy(false); }
  }

  return <Card title="Tutor notes" icon={<NotebookPen className="h-4 w-4 text-slate-500" aria-hidden />}
    badge={draft === null && <button type="button" onClick={() => setDraft(notes)} className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100">Edit</button>}>
    {draft === null
      ? <p className={`whitespace-pre-wrap text-sm ${notes ? 'text-slate-700' : 'text-slate-500'}`}>{notes || 'No notes for this session.'}</p>
      : <form onSubmit={e => { e.preventDefault(); void save(draft); }} className="flex flex-col gap-2">
        <fieldset disabled={busy} className="flex min-w-0 flex-col gap-2 disabled:opacity-60">
          <textarea aria-label="Tutor notes" value={draft} onChange={e => setDraft(e.target.value)} rows={4} maxLength={MAX_TUTOR_NOTES_LENGTH} autoFocus className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm" />
          {error && <ErrorBanner message={error} />}
          <div className="flex gap-2">
            <button type="submit" className="rounded-full bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" onClick={() => { setDraft(null); setError(null); }} className="rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">Cancel</button>
          </div>
        </fieldset>
      </form>}
  </Card>;
}
