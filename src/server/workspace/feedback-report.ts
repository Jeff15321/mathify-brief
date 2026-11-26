import type { SavedTutorFeedback } from '@/server/storage/contracts';
import { createHash } from 'node:crypto';
import { toPublicAnalysis } from './projections';
import type { CurrentWorkspace } from './schema';

/** Only the content available on the report, plus its generation identity. */
export function getFeedbackReport(workspace: CurrentWorkspace): SavedTutorFeedback['report'] {
  return {
    workspaceCreatedAt: workspace.createdAt,
    profile: workspace.demoProfile,
    questionText: workspace.questionText,
    analysis: workspace.analysis ? toPublicAnalysis(workspace.analysis) : null,
    attachments: workspace.attachments,
    whiteboardAsset: workspace.whiteboardAsset,
    brief: workspace.brief,
  };
}

export function getFeedbackReportId(workspace: CurrentWorkspace): string | null {
  if (workspace.phase !== 'complete' || !workspace.brief) return null;
  // New briefs contain a UUID; pre-existing briefs use their content and creation timestamps.
  // Hashing the snapshot also rejects feedback if report content changes after the page loaded.
  // `history` is excluded: it is added to the brief after the page loads.
  const brief = { ...workspace.brief, history: undefined };
  return createHash('sha256').update(JSON.stringify({ ...getFeedbackReport(workspace), brief })).digest('hex');
}
