import { RefreshCw } from 'lucide-react';
import { DEMO_PROFILE, type LearnerProfile } from '@/types/domain';
import { BriefBadge } from '@/components/brief/BriefCard';
import { formatDate } from '@/components/sessions/SessionCard';

const initials = DEMO_PROFILE.displayName.split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase();
const formatTime = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Who the profile is for, how much evidence it has, and the rebuild control. */
export function StudentCard({ profile, sessionCount, lastSessionDate, rebuildError, onRebuild }: {
  profile: LearnerProfile; sessionCount: number; lastSessionDate: string | null; rebuildError: string | null; onRebuild: () => void;
}) {
  const rebuilding = profile.rebuildStatus === 'rebuilding';
  const failed = profile.rebuildStatus === 'failed';
  const stats = [
    ['Sessions', String(sessionCount)],
    ['Last session', lastSessionDate ? formatDate(lastSessionDate) : 'None yet'],
    ['Profile updated', formatTime(profile.updatedAt)],
    ['Last rebuilt', profile.rebuiltAt ? formatTime(profile.rebuiltAt) : 'Never'],
  ];
  return <section aria-label="Student" className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-semibold text-white">{initials}</span>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-900">{DEMO_PROFILE.displayName}</h1>
          <BriefBadge className="self-start bg-blue-100 text-blue-700">Grade {DEMO_PROFILE.grade}</BriefBadge>
        </div>
      </div>
      <div className="flex flex-col gap-1 sm:items-end">
        <button type="button" disabled={rebuilding} onClick={onRebuild}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${rebuilding ? 'animate-spin' : ''}`} aria-hidden />
          {rebuilding ? 'Rebuilding…' : failed ? 'Retry rebuild' : 'Rebuild from sessions'}
        </button>
        {failed && <p role="alert" className="text-xs text-red-700">{rebuildError ?? 'The last rebuild failed.'} The previous profile is shown.</p>}
      </div>
    </div>
    <dl className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
      {stats.map(([label, value]) => <div key={label} className="flex flex-col gap-0.5">
        <dt className="text-xs text-slate-500">{label}</dt>
        <dd className="text-sm font-medium text-slate-900">{value}</dd>
      </div>)}
    </dl>
  </section>;
}
