import type { BriefCalibration } from '@/contracts/brief';
import { wilsonInterval } from '@/contracts/stats';
import { FEEDBACK_REASON_LABELS, type FeedbackReason } from '@/schemas/feedback';
import type { SavedTutorFeedback } from '@/server/storage/contracts';

const MAX_CONTEXT_CHARS = 600;
const RECENT_WINDOW = 20;

const REASON_GUIDANCE: Record<FeedbackReason, string> = {
  wrong_starting_point: 'Focus probe plans on the foundational prerequisite most likely blocking the student.',
  questions_too_easy: 'Avoid trivial arithmetic checks; ensure main probes genuinely challenge the target concept.',
  questions_too_hard: 'Keep main probes single-skill with smaller numbers and clearer scaffolding in easier retries.',
  missing_context: 'Include any critical units, constraints, or setup needed so each probe stands on its own.',
};

function countReasons(feedbacks: SavedTutorFeedback[]): Map<FeedbackReason, number> {
  const counts = new Map<FeedbackReason, number>();
  for (const item of feedbacks) {
    if (item.accuracy > 3) continue;
    for (const reason of item.reasons ?? []) {
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Summarizes recent tutor accuracy ratings and structured reason chips into concise,
 * tutor-only calibration guidance for future analyses and probe generation.
 */
export function buildFeedbackContext(feedbacks: SavedTutorFeedback[]): string | undefined {
  const recent = feedbacks.slice(0, RECENT_WINDOW);
  if (recent.length === 0) return undefined;

  const flagged = recent.filter((item) => item.accuracy <= 3);
  const reasonCounts = countReasons(recent);
  if (flagged.length === 0 && recent.length < 3) return undefined;

  const accurate = recent.length - flagged.length;
  const lines = [`Recent tutor ratings: ${accurate}/${recent.length} accurate.`];

  const sortedReasons = [...reasonCounts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [reason, count] of sortedReasons) {
    lines.push(`- Flagged ${count}x "${FEEDBACK_REASON_LABELS[reason]}": ${REASON_GUIDANCE[reason]}`);
  }

  for (const item of flagged) {
    const note = item.comments.trim();
    if (note && sortedReasons.length === 0) {
      lines.push(`- Recent tutor note: ${note.slice(0, 120)}`);
    }
  }

  const text = lines.join('\n');
  if (text.length <= MAX_CONTEXT_CHARS) return text;
  const cut = text.slice(0, MAX_CONTEXT_CHARS);
  const end = cut.lastIndexOf('\n');
  return end > 0 ? cut.slice(0, end) : cut;
}

/**
 * Computes empirical tutor accuracy calibration (Wilson 95% CI) once at least 3 reports
 * have been evaluated, giving tutors grounded confidence in brief reliability.
 */
export function computeHistoricalCalibration(feedbacks: SavedTutorFeedback[]): BriefCalibration | undefined {
  if (feedbacks.length < 3) return undefined;
  const accurateCount = feedbacks.filter((item) => item.accuracy >= 4).length;
  const { lower, upper } = wilsonInterval(accurateCount, feedbacks.length);
  const sortedReasons = [...countReasons(feedbacks).entries()].sort((a, b) => b[1] - a[1]);
  const topReason = sortedReasons[0]?.[0];

  return {
    ratedCount: feedbacks.length,
    accurateCount,
    accuracyRate: accurateCount / feedbacks.length,
    lower,
    upper,
    ...(topReason ? { topReason: FEEDBACK_REASON_LABELS[topReason] } : {}),
  };
}
