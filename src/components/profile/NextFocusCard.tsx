'use client';
import { useState } from 'react';
import { Target } from 'lucide-react';
import type { LearnerProfile } from '@/types/domain';
import { MAX_PROFILE_TEXT_LENGTH } from '@/schemas/profile';
import { BriefBadge } from '@/components/brief/BriefCard';
import { ErrorBanner } from '@/components/shared/ErrorBanner';

const secondary = 'rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-60';

/** The one thing to work on next; `onSave('')` hands it back to the AI. `onSave` rejects to keep the editor open. */
export function NextFocusCard({ profile, onSave }: { profile: Pick<LearnerProfile, 'nextFocus' | 'nextFocusSource'>; onSave: (nextFocus: string) => Promise<void> }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const byTutor = profile.nextFocusSource === 'tutor';

  async function save(value: string) {
    setBusy(true); setError(null);
    try { await onSave(value); setDraft(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'The focus could not be saved. Please try again.'); }
    finally { setBusy(false); }
  }

  return <section aria-label="Next session focus" className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-blue-900"><Target className="h-4 w-4 text-blue-600" aria-hidden /> Next session focus</h2>
      <BriefBadge className={byTutor ? 'bg-violet-100 text-violet-700' : 'bg-white text-blue-700'}>{byTutor ? 'Written by tutor' : 'Suggested by AI'}</BriefBadge>
    </div>
    {draft === null
      ? <>
        <p className={profile.nextFocus ? 'text-lg font-medium leading-7 text-slate-900' : 'text-sm text-slate-600'}>
          {profile.nextFocus || 'No focus yet. Write your own, or add a session for an AI suggestion.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => setDraft(profile.nextFocus)} className={secondary}>{profile.nextFocus ? 'Edit' : 'Write focus'}</button>
          {byTutor && <button type="button" disabled={busy} onClick={() => void save('')} className={secondary}>{busy ? 'Saving…' : 'Let AI suggest'}</button>}
        </div>
      </>
      : <form onSubmit={e => { e.preventDefault(); void save(draft); }} className="flex flex-col gap-2">
        <fieldset disabled={busy} className="flex min-w-0 flex-col gap-2 disabled:opacity-60">
          <textarea aria-label="Next session focus" value={draft} onChange={e => setDraft(e.target.value)} rows={2} maxLength={MAX_PROFILE_TEXT_LENGTH} autoFocus className="w-full rounded-lg border border-blue-200 bg-white p-3 text-sm" />
          <div className="flex gap-2">
            <button type="submit" disabled={!draft.trim()} className="rounded-full bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" onClick={() => { setDraft(null); setError(null); }} className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">Cancel</button>
          </div>
        </fieldset>
      </form>}
    {error && <ErrorBanner message={error} />}
  </section>;
}
