import { feedbackReportIdSchema } from '@/schemas/feedback';
import { ApiError, toApiErrorResponse } from '@/server/errors';
import { submitTutorFeedback } from '@/server/feedback-service';
import { getStores } from '@/server/storage';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };

export async function GET(request: Request) {
  try {
    const parsed = feedbackReportIdSchema.safeParse(new URL(request.url).searchParams.get('reportId'));
    if (!parsed.success) throw new ApiError(400, 'INVALID_INPUT', 'A valid reportId is required.');
    const saved = await getStores().feedbackStore.read(parsed.data);
    return Response.json({ feedback: saved ? { reportId: saved.reportId, submittedAt: saved.submittedAt } : null }, { headers });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    let input: unknown;
    try { input = await request.json(); }
    catch { throw new ApiError(400, 'INVALID_INPUT', 'Send feedback as valid JSON.'); }
    return Response.json({ feedback: await submitTutorFeedback(input) }, { headers });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
