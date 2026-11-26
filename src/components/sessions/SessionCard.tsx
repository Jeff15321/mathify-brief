import { formatDate } from '@/components/shared/format-date';
import Link from 'next/link';
import type { PublicSessionSummary, SessionStatus } from '@/contracts/sessions';
import { Badge } from '@/components/shared/Card';

export const STATUS: Record<SessionStatus, { title: string; badge: string; className: string }> = {
  ready: { title: 'Untitled session', badge: 'Ready', className: 'bg-fill text-ink' },
  pending: { title: 'Summarizing…', badge: 'Pending', className: 'bg-wash text-ink' },
  failed: { title: 'Summary failed', badge: 'Failed', className: 'bg-wash text-ink' },
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** One session in the list; the whole card links to the session, and failed ones offer a retry. */
export function SessionCard({ session, onRetry, retrying = false }: { session: PublicSessionSummary; onRetry: (id: string) => void; retrying?: boolean }) {
  const status = STATUS[session.status];
  return <li className="relative flex flex-col gap-2 rounded-card border border-line bg-card p-4 sm:p-6 hover:border-pink has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-pink">
    <div className="flex items-start justify-between gap-2">
      <h3 className="text-xl leading-tight font-bold text-ink">
        <Link href={`/sessions/${session.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">{session.title ?? status.title}</Link>
      </h3>
      <Badge className={status.className}>{status.badge}</Badge>
    </div>
    <p className="text-sm text-muted">{formatDate(session.sessionDate)}</p>
    {session.summary && <p className="line-clamp-2 text-sm text-ink">{session.summary}</p>}
    <div className="flex items-center justify-between gap-2 text-sm text-muted">
      <span>{plural(session.observationCount, 'observation')} · {plural(session.whiteboardCount, 'whiteboard')}</span>
      {session.status === 'failed' && <button type="button" disabled={retrying} onClick={() => onRetry(session.id)}
        className="relative z-10 rounded-full border border-connector px-3 py-1 font-bold text-ink hover:bg-fill disabled:opacity-60">{retrying ? 'Retrying…' : 'Retry'}</button>}
    </div>
  </li>;
}
