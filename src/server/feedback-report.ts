import { createHash } from 'node:crypto';
import { toPublicAnalysis, type CurrentWorkspace } from '@/types/domain';

/** Only the content available on the report, plus its generation identity. */
export function getFeedbackReport(workspace: CurrentWorkspace) {
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
  return createHash('sha256').update(JSON.stringify(getFeedbackReport(workspace))).digest('hex');
}
