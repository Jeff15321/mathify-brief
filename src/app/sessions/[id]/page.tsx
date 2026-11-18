'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Images, Lightbulb, Sparkles } from 'lucide-react';
import { ApiClientError, fetchSession, retrySessionSummary, updateSession } from '@/lib/api-client';
import type { TutorSession } from '@/types/domain';
import { BriefBadge, BriefCard } from '@/components/brief/BriefCard';
import { STATUS, formatDate } from '@/components/sessions/SessionCard';
import { ObservationList } from '@/components/sessions/ObservationList';
import { EditableNotes } from '@/components/sessions/EditableNotes';
import { EditableSessionDate } from '@/components/sessions/EditableSessionDate';
import { TranscriptViewer } from '@/components/sessions/TranscriptViewer';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { LoadingState } from '@/components/shared/LoadingState';
import { MathText } from '@/components/shared/MathText';

function message(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }
const icon = 'h-4 w-4 text-slate-500';

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<TutorSession | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => fetchSession(id).then(next => { setSession(next); setError(null); }, err => {
    if (err instanceof ApiClientError && err.code === 'NOT_FOUND') setNotFound(true);
    else setError(message(err));
  }), [id]);
  useEffect(() => { void load(); }, [load]);
  const pending = session?.status === 'pending';
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => void load(), 3000);
    return () => clearInterval(timer);
  }, [pending, load]);

  async function retry() {
    setBusy(true);
    try { setSession(await retrySessionSummary(id)); }
    catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  }
  async function save(changes: { sessionDate?: string; tutorNotes?: string }) { setSession(await updateSession(id, changes)); }

  const status = session && STATUS[session.status];
  return <main className="min-h-screen bg-slate-50">
    <div className="mx-auto flex max-w-4xl flex-col gap-4 p-4 sm:p-6">
      <Link href="/sessions" className="inline-flex items-center gap-1 self-start text-sm font-medium text-slate-600 hover:text-blue-700">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All sessions
      </Link>
      {error && <ErrorBanner message={error} onRetry={() => void load()} />}
      {notFound && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
        <h1 className="font-medium text-slate-900">Session not found</h1>
        <p className="mt-1">It may have been deleted. <Link href="/sessions" className="font-medium text-blue-700 hover:underline">Back to sessions</Link></p>
      </div>}
      {!session && !error && !notFound && <LoadingState label="Loading session…" />}
      {session && status && <>
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-slate-900">{session.title ?? status.title}</h1>
          <div className="flex flex-wrap gap-2">
            <BriefBadge className="bg-blue-100 text-blue-700">Session · {formatDate(session.sessionDate)}</BriefBadge>
            <BriefBadge className="bg-slate-100 text-slate-600">Uploaded · {new Date(session.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</BriefBadge>
            <BriefBadge className={status.className}>{status.badge}</BriefBadge>
          </div>
        </header>
        <BriefCard title="Summary" icon={<Sparkles className={icon} aria-hidden />}>
          {session.status === 'pending' && <LoadingState label="Summarizing this session…" />}
          {session.status === 'failed' && <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-700">
            <p>The AI summary could not be generated.</p>
            <button type="button" disabled={busy} onClick={() => void retry()} className="rounded-full border border-slate-300 px-3 py-1 font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60">{busy ? 'Retrying…' : 'Retry'}</button>
          </div>}
          {session.status === 'ready' && session.summary && <MathText text={session.summary} className="text-sm leading-6 text-slate-700" />}
        </BriefCard>
        {session.status === 'ready' && <BriefCard title="Observations" icon={<Lightbulb className={icon} aria-hidden />}>
          <ObservationList observations={session.observations} />
        </BriefCard>}
        <BriefCard title="Whiteboards" icon={<Images className={icon} aria-hidden />}>
          {session.whiteboards.length === 0
            ? <p className="text-sm text-slate-500">No whiteboards uploaded.</p>
            : <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {session.whiteboards.map(asset => { const src = `/api/sessions/${session.id}/assets/${asset.id}`; return <li key={asset.id}>
                <a href={src} target="_blank" rel="noopener noreferrer" title={`Open ${asset.fileName} full size`} className="block overflow-hidden rounded-lg border border-slate-200 bg-slate-50 hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={asset.fileName} className="aspect-4/3 w-full object-contain" />
                </a>
              </li>; })}
            </ul>}
        </BriefCard>
        <EditableNotes notes={session.tutorNotes} onSave={tutorNotes => save({ tutorNotes })} />
        <EditableSessionDate key={session.sessionDate} date={session.sessionDate} onSave={sessionDate => save({ sessionDate })} />
        <TranscriptViewer text={session.transcriptText} fileName={session.transcriptFileName} />
      </>}
    </div>
  </main>;
}
