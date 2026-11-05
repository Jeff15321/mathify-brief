import { tutorFeedbackSchema, type TutorFeedbackInput } from '@/schemas/feedback';
import { ApiError } from './errors';
import { getFeedbackReport, getFeedbackReportId } from './feedback-report';
import { getStores, type createStores } from './storage';

type Stores = ReturnType<typeof createStores>;

/** Hold the same lock used by new intake through validation, asset copy, and durable save. */
export async function submitTutorFeedback(input: unknown, stores: Stores = getStores()) {
  const parsed = tutorFeedbackSchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(400, 'INVALID_INPUT', 'Choose a rating from 1 to 5 for all three questions; comments must be at most 2000 characters.');
  }
  const feedback: TutorFeedbackInput = parsed.data;
  let submittedAt = '';
  await stores.workspaceStore.update(async (workspace) => {
    if (!workspace || getFeedbackReportId(workspace) !== feedback.reportId) {
      throw new ApiError(409, 'INVALID_STATE', 'This report has changed or been replaced. Open the current report before submitting feedback.');
    }
    const existing = await stores.feedbackStore.read(feedback.reportId);
    if (existing) {
      if (existing.accuracy !== feedback.accuracy || existing.clarity !== feedback.clarity ||
          existing.startingPointUsefulness !== feedback.startingPointUsefulness || existing.comments !== feedback.comments) {
        throw new ApiError(409, 'INVALID_STATE', 'Feedback has already been saved for this report. Reload to see its saved status.');
      }
      submittedAt = existing.submittedAt;
      return workspace;
    }
    const assetMetadata = [...workspace.attachments, ...(workspace.whiteboardAsset ? [workspace.whiteboardAsset] : [])];
    const assets = await Promise.all(assetMetadata.map(async (meta) => {
      const asset = await stores.assetStore.get(meta.id);
      if (!asset) throw new Error(`Cannot archive report asset ${meta.id}`);
      return { id: meta.id, base64: asset.bytes.toString('base64') };
    }));
    submittedAt = new Date().toISOString();
    await stores.feedbackStore.write({
      ...feedback, schemaVersion: 1, submittedAt, report: getFeedbackReport(workspace), assets,
    });
    return workspace;
  });
  return { reportId: feedback.reportId, submittedAt };
}
