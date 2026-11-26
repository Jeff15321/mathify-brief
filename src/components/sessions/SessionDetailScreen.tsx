'use client';
import { formatDate } from '@/components/shared/format-date';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Images, Lightbulb, Sparkles, Trash2 } from 'lucide-react';
import { ApiClientError } from '@/client/http';
import { deleteSession, fetchSession, retrySessionSummary, updateSession } from '@/client/sessions';
import type { TutorSession } from '@/contracts/sessions';
import { Badge, Card } from '@/components/shared/Card';
import { STATUS } from './SessionCard';
import { ObservationList } from './ObservationList';
import { EditableNotes } from './EditableNotes';
import { EditableSessionDate } from './EditableSessionDate';
import { TranscriptViewer } from './TranscriptViewer';
import { ErrorBanner } from '@/components/shared/ErrorBanner';
import { LoadingState } from '@/components/shared/LoadingState';
import { MathText } from '@/components/shared/MathText';

function message(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }
const icon = 'h-4 w-4 text-muted';

export default function SessionDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
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
  async function remove() {
    if (!window.confirm('Delete this session? Its transcript, notes and whiteboards will be removed.')) return;
    setBusy(true);
    try { await deleteSession(id); router.push('/sessions'); }
    catch (err) { setError(message(err)); setBusy(false); }
  }
  async function save(changes: { sessionDate?: string; tutorNotes?: string }) { setSession(await updateSession(id, changes)); }

  const status = session && STATUS[session.status];
  return <main className="flex-1 bg-ground">
    <div className="page-shell flex flex-col gap-5">
      <Link href="/sessions" className="inline-flex items-center gap-1 self-start text-sm font-semibold text-muted hover:text-pink-deep">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All sessions
      </Link>
      {error && <ErrorBanner message={error} onRetry={() => void load()} />}
      {notFound && <div className="rounded-card border border-dashed border-connector bg-card p-6 text-sm text-muted">
        <h1 className="page-title">Session not found</h1>
        <p className="mt-1">It may have been deleted. <Link href="/sessions" className="font-semibold text-pink-deep hover:underline">Back to sessions</Link></p>
      </div>}
      {!session && !error && !notFound && <LoadingState label="Loading session…" />}
      {session && status && <>
        <header className="flex flex-col gap-2">
          <h1 className="page-title">{session.title ?? status.title}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-wash text-ink">Session · {formatDate(session.sessionDate)}</Badge>
            <Badge className="bg-fill text-muted">Uploaded · {new Date(session.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Badge>
            <Badge className={status.className}>{status.badge}</Badge>
          </div>
        </header>
        <Card title="Summary" icon={<Sparkles className={icon} aria-hidden />}>
          {session.status === 'pending' && <LoadingState label="Summarizing this session…" />}
          {session.status === 'failed' && <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink">
            <p>The AI summary could not be generated.</p>
            <button type="button" disabled={busy} onClick={() => void retry()} className="action-secondary">{busy ? 'Retrying…' : 'Retry'}</button>
          </div>}
          {session.status === 'ready' && session.summary && <MathText text={session.summary} className="text-sm leading-6 text-ink" />}
        </Card>
        {session.status === 'ready' && <Card title="Observations" icon={<Lightbulb className={icon} aria-hidden />}>
          <ObservationList observations={session.observations} />
        </Card>}
        <Card title="Whiteboards" icon={<Images className={icon} aria-hidden />}>
          {session.whiteboards.length === 0
            ? <p className="text-sm text-muted">No whiteboards uploaded.</p>
            : <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {session.whiteboards.map(asset => { const src = `/api/sessions/${session.id}/assets/${asset.id}`; return <li key={asset.id}>
                <a href={src} target="_blank" rel="noopener noreferrer" title={`Open ${asset.fileName} full size`} className="block overflow-hidden rounded-panel border border-line bg-ground hover:border-pink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={asset.fileName} className="aspect-4/3 w-full object-contain" />
                </a>
              </li>; })}
            </ul>}
        </Card>
        <EditableNotes notes={session.tutorNotes} onSave={tutorNotes => save({ tutorNotes })} />
        <EditableSessionDate key={session.sessionDate} date={session.sessionDate} onSave={sessionDate => save({ sessionDate })} />
        <TranscriptViewer text={session.transcriptText} fileName={session.transcriptFileName} />
        <button type="button" disabled={busy} onClick={() => void remove()}
          className="action-secondary self-start">
          <Trash2 className="h-4 w-4" aria-hidden /> Delete session
        </button>
      </>}
    </div>
  </main>;
}
