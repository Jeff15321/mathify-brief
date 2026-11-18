'use client';
import { useState } from 'react';
import { NotebookPen } from 'lucide-react';
import { MAX_TUTOR_NOTES_LENGTH } from '@/lib/constants';
import { BriefCard } from '@/components/brief/BriefCard';
import { ErrorBanner } from '@/components/shared/ErrorBanner';

/** Free-text profile notes, saved on blur or with Save; the AI reads them but never changes them. */
export function TutorNotesCard({ notes, onSave }: { notes: string; onSave: (notes: string) => Promise<void> }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = draft !== null && draft.trim() !== notes;

  async function save() {
    if (!changed) { setDraft(null); return; }
    setBusy(true); setError(null);
    try { await onSave(draft); setDraft(null); setSaved(true); }
    catch (err) { setError(err instanceof Error ? err.message : 'The notes could not be saved. Please try again.'); }
    finally { setBusy(false); }
  }

  return <BriefCard title={<label htmlFor="profileTutorNotes">Tutor notes</label>} icon={<NotebookPen className="h-4 w-4 text-slate-500" aria-hidden />}
    badge={<span className="text-xs text-slate-500">Never changed by the AI</span>}>
    <form onSubmit={e => { e.preventDefault(); void save(); }} className="flex flex-col gap-2">
      <textarea id="profileTutorNotes" value={draft ?? notes} onChange={e => { setDraft(e.target.value); setSaved(false); }} onBlur={() => void save()}
        rows={4} maxLength={MAX_TUTOR_NOTES_LENGTH} placeholder="Anything the AI should keep in mind, like what motivates this student."
        className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm" />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy || !changed} className="rounded-full bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>
        {saved && !changed && <span role="status" className="text-xs text-emerald-700">Saved</span>}
      </div>
      {error && <ErrorBanner message={error} />}
    </form>
  </BriefCard>;
}
