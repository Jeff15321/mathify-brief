'use client';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Lightbulb, Repeat, Sprout, TriangleAlert } from 'lucide-react';
import { fetchProfile, fetchSessions, rebuildProfile, updateProfile } from '@/lib/api-client';
import type { ProfileUpdate } from '@/schemas/profile';
import type { LearnerProfile, ObservationCategory, PublicSessionSummary } from '@/types/domain';
import { StudentCard } from '@/components/profile/StudentCard';
import { NextFocusCard } from '@/components/profile/NextFocusCard';
import { ProfileSection } from '@/components/profile/ProfileSection';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { LoadingState } from '@/components/shared/LoadingState';

function message(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }
const icon = 'h-4 w-4';
const SECTIONS: { category: ObservationCategory; title: string; icon: ReactNode; accent: string }[] = [
  { category: 'struggle', title: 'Struggles', icon: <TriangleAlert className={`${icon} text-amber-600`} aria-hidden />, accent: 'border-amber-300' },
  { category: 'strength', title: 'Strengths', icon: <Sprout className={`${icon} text-emerald-600`} aria-hidden />, accent: 'border-emerald-300' },
  { category: 'what_works', title: 'What works when teaching', icon: <Lightbulb className={`${icon} text-blue-600`} aria-hidden />, accent: 'border-blue-300' },
  { category: 'habit', title: 'Habits', icon: <Repeat className={`${icon} text-slate-500`} aria-hidden />, accent: 'border-slate-300' },
];

export default function ProfilePage() {
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
  return <main className="min-h-screen bg-slate-50">
    <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4 sm:p-6">
      {error && <ErrorBanner message={error} onRetry={() => void load()} />}
      {(!profile || !sessions) && !error && <LoadingState label="Loading learner profile…" />}
      {profile && sessions && <>
        <StudentCard profile={profile} sessionCount={sessions.length} lastSessionDate={sessions.map(s => s.sessionDate).sort().at(-1) ?? null} />
        {empty
          ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            <h2 className="font-medium text-slate-900">No sessions yet</h2>
            <p className="mt-1">The profile is built from past sessions. <Link href="/sessions" className="font-medium text-blue-700 hover:underline">Upload a session</Link> to see struggles, strengths and what works.</p>
          </div>
          : <>
            <NextFocusCard profile={profile} onSave={async nextFocus => { await save({ nextFocus }); if (!nextFocus) void rebuild(); }} />
            <div className="grid items-start gap-4 lg:grid-cols-2">
              {SECTIONS.map(section => <ProfileSection key={section.category} {...section} items={profile.items.filter(item => item.category === section.category)} onSave={save} />)}
            </div>
          </>}
      </>}
    </div>
  </main>;
}
