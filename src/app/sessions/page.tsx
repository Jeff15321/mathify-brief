'use client';
import { useCallback, useEffect, useState } from 'react';
import { fetchSessions, retrySessionSummary } from '@/lib/api-client';
import type { PublicSessionSummary } from '@/types/domain';
import { SessionUploadForm } from '@/components/sessions/SessionUploadForm';
import { SessionCard } from '@/components/sessions/SessionCard';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { LoadingState } from '@/components/shared/LoadingState';

function message(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }

export default function SessionsPage() {
  const [sessions, setSessions] = useState<PublicSessionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const load = useCallback(() => fetchSessions().then(next => { setSessions(next); setError(null); }, err => setError(message(err))), []);
  useEffect(() => { void load(); }, [load]);
  const pending = sessions?.some(s => s.status === 'pending') ?? false;
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => void load(), 3000);
    return () => clearInterval(timer);
  }, [pending, load]);

  async function retry(id: string) {
    setRetrying(id);
    try { await retrySessionSummary(id); }
    catch (err) { setError(message(err)); }
    finally { setRetrying(null); await load(); }
  }

  return <main className="min-h-screen bg-slate-50">
    <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Past sessions</h1>
        <p className="mt-1 text-sm text-slate-600">Upload TVO session transcripts to build this student&apos;s learner profile.</p>
      </header>
      <div className="grid items-start gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <SessionUploadForm onUploaded={() => void load()} />
        <section aria-label="Sessions" className="flex flex-col gap-3">
          {error && <ErrorBanner message={error} onRetry={() => void load()} />}
          {!sessions && !error && <LoadingState label="Loading sessions…" />}
          {sessions?.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            <p className="font-medium text-slate-900">No sessions yet</p>
            <p className="mt-1">Upload a transcript to get started. Sample transcripts and whiteboards are in <code className="rounded bg-slate-100 px-1">samples/sessions/</code>.</p>
          </div>}
          {sessions && sessions.length > 0 && <ul className="flex flex-col gap-3">
            {sessions.map(session => <SessionCard key={session.id} session={session} onRetry={id => void retry(id)} retrying={retrying === session.id} />)}
          </ul>}
        </section>
      </div>
    </div>
  </main>;
}
