import Link from 'next/link';
import type { PublicSessionSummary, SessionStatus } from '@/types/domain';
import { BriefBadge } from '@/components/brief/BriefCard';

const STATUS: Record<SessionStatus, { title: string; badge: string; className: string }> = {
  ready: { title: 'Untitled session', badge: 'Ready', className: 'bg-emerald-100 text-emerald-700' },
  pending: { title: 'Summarizing…', badge: 'Pending', className: 'bg-amber-100 text-amber-800' },
  failed: { title: 'Summary failed', badge: 'Failed', className: 'bg-red-100 text-red-700' },
};

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** One session in the list; the whole card links to the session, and failed ones offer a retry. */
export function SessionCard({ session, onRetry, retrying = false }: { session: PublicSessionSummary; onRetry: (id: string) => void; retrying?: boolean }) {
  const status = STATUS[session.status];
  return <li className="relative flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-300 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-blue-500">
    <div className="flex items-start justify-between gap-2">
      <h3 className="text-sm font-semibold text-slate-900">
        <Link href={`/sessions/${session.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">{session.title ?? status.title}</Link>
      </h3>
      <BriefBadge className={status.className}>{status.badge}</BriefBadge>
    </div>
    <p className="text-xs text-slate-500">{formatDate(session.sessionDate)}</p>
    {session.summary && <p className="line-clamp-2 text-sm text-slate-700">{session.summary}</p>}
    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
      <span>{plural(session.observationCount, 'observation')} · {plural(session.whiteboardCount, 'whiteboard')}</span>
      {session.status === 'failed' && <button type="button" disabled={retrying} onClick={() => onRetry(session.id)}
        className="relative z-10 rounded-full border border-slate-300 px-3 py-1 font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60">{retrying ? 'Retrying…' : 'Retry'}</button>}
    </div>
  </li>;
}
