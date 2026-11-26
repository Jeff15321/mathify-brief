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

  return <Card title="Tutor notes" icon={<NotebookPen className="h-4 w-4 text-muted" aria-hidden />}
    badge={draft === null && <button type="button" onClick={() => setDraft(notes)} className="rounded-full border border-connector px-3 py-1 text-sm font-bold text-ink hover:bg-fill">Edit</button>}>
    {draft === null
      ? <p className={`whitespace-pre-wrap text-sm ${notes ? 'text-ink' : 'text-muted'}`}>{notes || 'No notes for this session.'}</p>
      : <form onSubmit={e => { e.preventDefault(); void save(draft); }} className="flex flex-col gap-2">
        <fieldset disabled={busy} className="flex min-w-0 flex-col gap-2 disabled:opacity-60">
          <textarea aria-label="Tutor notes" value={draft} onChange={e => setDraft(e.target.value)} rows={4} maxLength={MAX_TUTOR_NOTES_LENGTH} autoFocus className="w-full rounded-panel border border-connector bg-card p-3 text-sm" />
          {error && <ErrorBanner message={error} />}
          <div className="flex gap-2">
            <button type="submit" className="rounded-full bg-pink px-4 py-1.5 text-sm font-bold text-card hover:bg-pink-deep">{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" onClick={() => { setDraft(null); setError(null); }} className="rounded-full border border-connector px-4 py-1.5 text-sm font-bold text-ink hover:bg-fill">Cancel</button>
          </div>
        </fieldset>
      </form>}
  </Card>;
}
