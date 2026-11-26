'use client';
import { useState } from 'react';
import { Target } from 'lucide-react';
import type { LearnerProfile } from '@/contracts/profile';
import { MAX_PROFILE_TEXT_LENGTH } from '@/schemas/profile';
import { Badge } from '@/components/shared/Card';
import { ErrorBanner } from '@/components/shared/ErrorBanner';

const secondary = 'action-secondary';

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

  return <section aria-label="Next session focus" className="flex flex-col gap-3 rounded-card border border-line bg-card p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-xl leading-tight font-semibold text-ink"><Target className="h-4 w-4 text-pink-deep" aria-hidden /> Next session focus</h2>
      <Badge className={byTutor ? 'bg-fill text-ink' : 'bg-card text-pink-deep'}>{byTutor ? 'Written by tutor' : 'Suggested by AI'}</Badge>
    </div>
    {draft === null
      ? <>
        <p className={profile.nextFocus ? 'text-lg font-semibold leading-7 text-ink' : 'text-sm text-muted'}>
          {profile.nextFocus || 'No focus yet. Write your own, or add a session for an AI suggestion.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => setDraft(profile.nextFocus)} className={secondary}>{profile.nextFocus ? 'Edit' : 'Write focus'}</button>
          {byTutor && <button type="button" disabled={busy} onClick={() => void save('')} className={secondary}>{busy ? 'Saving…' : 'Let AI suggest'}</button>}
        </div>
      </>
      : <form onSubmit={e => { e.preventDefault(); void save(draft); }} className="flex flex-col gap-2">
        <fieldset disabled={busy} className="flex min-w-0 flex-col gap-2 disabled:opacity-60">
          <textarea aria-label="Next session focus" value={draft} onChange={e => setDraft(e.target.value)} rows={2} maxLength={MAX_PROFILE_TEXT_LENGTH} autoFocus className="w-full rounded-panel border border-line bg-card p-3 text-sm" />
          <div className="flex gap-2">
            <button type="submit" disabled={!draft.trim()} className="action-primary">{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" onClick={() => { setDraft(null); setError(null); }} className="action-secondary">Cancel</button>
          </div>
        </fieldset>
      </form>}
    {error && <ErrorBanner message={error} />}
  </section>;
}
