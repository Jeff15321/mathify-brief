'use client';
import { useCallback, useEffect, useState } from 'react';
import { fetchSessions, retrySessionSummary } from '@/client/sessions';
import type { PublicSessionSummary } from '@/contracts/sessions';
import { SessionUploadForm } from './SessionUploadForm';
import { SessionCard } from './SessionCard';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { LoadingState } from '@/components/shared/LoadingState';

function message(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }

export default function SessionsScreen() {
  const [sessions, setSessions] = useState<PublicSessionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
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

  return <main className="flex-1 bg-ground">
    <div className="page-shell flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Past sessions</h1>
          <p className="mt-1 text-sm text-muted">Review previous tutoring sessions and add new transcripts.</p>
        </div>
        {!adding && <button type="button" onClick={() => setAdding(true)} className="action-primary">Add session</button>}
      </header>
      {adding
        ? <div className="flex max-w-xl flex-col gap-3">
          <button type="button" onClick={() => setAdding(false)} className="self-start text-sm font-semibold text-pink-deep hover:underline">Back to sessions</button>
          <SessionUploadForm onUploaded={() => { setAdding(false); void load(); }} />
        </div>
        : <section aria-label="Sessions" className="flex flex-col gap-3">
          {error && <ErrorBanner message={error} onRetry={() => void load()} />}
          {!sessions && !error && <LoadingState label="Loading sessions…" />}
          {sessions?.length === 0 && <div className="rounded-card border border-dashed border-connector bg-card p-6 text-sm text-muted">
            <p className="font-semibold text-ink">No sessions yet</p>
            <p className="mt-1">Add a transcript to see the session summary and what to work on next.</p>
          </div>}
          {sessions && sessions.length > 0 && <ul className="flex flex-col gap-3">
            {sessions.map(session => <SessionCard key={session.id} session={session} onRetry={id => void retry(id)} retrying={retrying === session.id} />)}
          </ul>}
        </section>}
    </div>
  </main>;
}
