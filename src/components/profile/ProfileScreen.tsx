'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchProfile, rebuildProfile, updateProfile } from '@/client/profile';
import { fetchSessions } from '@/client/sessions';
import type { ProfileUpdate } from '@/schemas/profile';
import type { LearnerProfile } from '@/contracts/profile';
import type { PublicSessionSummary } from '@/contracts/sessions';
import { StudentCard } from './StudentCard';
import { NextFocusCard } from './NextFocusCard';
import { LearningProgressCard } from './LearningProgressCard';
import { SessionObservations } from './SessionObservations';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { LoadingState } from '@/components/shared/LoadingState';

function message(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }

export default function ProfileScreen() {
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [sessions, setSessions] = useState<PublicSessionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => Promise.all([fetchProfile(), fetchSessions()]).then(([nextProfile, nextSessions]) => {
    setProfile(nextProfile); setSessions(nextSessions); setError(null);
  }, err => setError(message(err))), []);
  useEffect(() => { void load(); }, [load]);
  // Uploads and session edits rebuild the profile in the background.
  const busy = profile?.rebuildStatus === 'rebuilding' || (sessions?.some(s => s.status === 'pending') ?? false);
  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(() => void load(), 3000);
    return () => clearInterval(timer);
  }, [busy, load]);

  async function save(changes: ProfileUpdate) { setProfile(await updateProfile(changes)); }
  async function rebuild() {
    setProfile(current => current && { ...current, rebuildStatus: 'rebuilding' });
    try { setProfile(await rebuildProfile()); }
    catch { setProfile(current => current && { ...current, rebuildStatus: 'failed' }); void load(); }
  }

  const empty = sessions?.length === 0 && profile?.items.length === 0 && !profile.nextFocus;
  return <main className="min-h-screen bg-ground">
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-6 lg:p-12">
      {error && <ErrorBanner message={error} onRetry={() => void load()} />}
      {(!profile || !sessions) && !error && <LoadingState label="Loading learner profile…" />}
      {profile && sessions && <>
        <StudentCard profile={profile} sessionCount={sessions.length} lastSessionDate={sessions.map(s => s.sessionDate).sort().at(-1) ?? null} />
        {empty
          ? <div className="rounded-card border border-dashed border-connector bg-card p-6 text-sm text-muted">
            <h2 className="font-bold text-ink">No sessions yet</h2>
            <p className="mt-1">The profile is built from past sessions. <Link href="/sessions" className="font-bold text-brand-deep hover:underline">Upload a session</Link> to see struggles, strengths and what works.</p>
          </div>
          : <>
            <NextFocusCard profile={profile} onSave={async nextFocus => { await save({ nextFocus }); if (!nextFocus) void rebuild(); }} />
            <LearningProgressCard profile={profile} sessions={sessions} />
            <SessionObservations items={profile.items} onSave={save} />
          </>}
      </>}
    </div>
  </main>;
}
