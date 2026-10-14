import { probeAnswersSchema } from '@/schemas/workspace';
import { submitBrief } from '@/server/brief-service';
import { ApiError, toApiErrorResponse } from '@/server/errors';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const answersRaw = formData.get('answers');
    const whiteboardEntry = formData.get('whiteboard');

    if (typeof answersRaw !== 'string') {
      throw new ApiError(400, 'INVALID_INPUT', 'answers must be a JSON string field');
    }

    let answersJson: unknown;
    try {
      answersJson = JSON.parse(answersRaw);
    } catch {
      throw new ApiError(400, 'INVALID_INPUT', 'answers is not valid JSON');
    }

    const parsedAnswers = probeAnswersSchema.safeParse(answersJson);
    if (!parsedAnswers.success) {
      throw new ApiError(400, 'INVALID_INPUT', `Invalid answers: ${parsedAnswers.error.message}`);
    }

    let whiteboardPng: Buffer | null = null;
    if (whiteboardEntry instanceof File) {
      if (whiteboardEntry.type !== 'image/png') {
        throw new ApiError(400, 'INVALID_INPUT', 'whiteboard must be image/png');
      }
      whiteboardPng = Buffer.from(await whiteboardEntry.arrayBuffer());
    }

    const brief = await submitBrief({ answers: parsedAnswers.data, whiteboardPng });
    return Response.json({ brief }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
