import type { LearnerProfile } from '@/contracts/profile';
import type { PublicSessionSummary } from '@/contracts/sessions';
import { wilsonInterval } from '@/contracts/stats';

export interface LearningProgressSummary {
  totalStruggles: number;
  progressedStruggles: number;
  readySessionCount: number;
  whatWorksCount: number;
  confidenceRange: string | null;
}

/**
 * Computes longitudinal student progress from summarized sessions and profile item statuses.
 * Descriptive within-student measure across sessions (no untreated control group).
 */
export function summarizeLearningProgress(
  profile: LearnerProfile,
  sessions: PublicSessionSummary[],
): LearningProgressSummary {
  const struggles = profile.items.filter((item) => item.category === 'struggle');
  const progressedStruggles = struggles.filter((item) => item.status === 'improving' || item.status === 'resolved').length;
  const readySessionCount = sessions.filter((session) => session.status === 'ready').length;
  const whatWorksCount = profile.items.filter((item) => item.category === 'what_works').length;

  let confidenceRange: string | null = null;
  if (struggles.length >= 2) {
    const { lower, upper } = wilsonInterval(progressedStruggles, struggles.length);
    confidenceRange = `${Math.round(lower * 100)}%–${Math.round(upper * 100)}% CI`;
  }

  return {
    totalStruggles: struggles.length,
    progressedStruggles,
    readySessionCount,
    whatWorksCount,
    confidenceRange,
  };
}
