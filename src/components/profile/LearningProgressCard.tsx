import { TrendingUp } from 'lucide-react';
import type { LearnerProfile } from '@/contracts/profile';
import type { PublicSessionSummary } from '@/contracts/sessions';
import { summarizeLearningProgress } from './progress';

/** Minimal longitudinal usefulness card derived from summarized sessions and profile statuses. */
export function LearningProgressCard({
  profile,
  sessions,
}: {
  profile: LearnerProfile;
  sessions: PublicSessionSummary[];
}) {
  const stats = summarizeLearningProgress(profile, sessions);

  return (
    <section aria-label="Learning progress" className="flex flex-col gap-3 rounded-card border border-line bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <TrendingUp className="h-4 w-4 text-brand-deep" aria-hidden="true" />
          Learning progress
        </h2>
        <span className="text-xs text-muted">Observed across {stats.readySessionCount} summarized {stats.readySessionCount === 1 ? 'session' : 'sessions'}</span>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-panel bg-fill/60 p-3">
          <dt className="text-sm text-muted">Struggles improving or resolved</dt>
          <dd className="mt-0.5 text-lg font-bold text-ink">
            {stats.totalStruggles > 0 ? `${stats.progressedStruggles}/${stats.totalStruggles}` : 'None tracked'}
            {stats.confidenceRange && <span className="ml-2 text-xs font-normal text-muted">({stats.confidenceRange})</span>}
          </dd>
        </div>
        <div className="rounded-panel bg-fill/60 p-3">
          <dt className="text-sm text-muted">Working teaching strategies</dt>
          <dd className="mt-0.5 text-lg font-bold text-ink">{stats.whatWorksCount}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted">Descriptive progress across sessions (no control group).</p>
    </section>
  );
}
