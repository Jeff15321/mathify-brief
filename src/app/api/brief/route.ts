import { submitBrief } from '@/server/brief-service';
import { ApiError, toApiErrorResponse } from '@/server/errors';

export const runtime = 'nodejs';

/** Ends probing and generates the Tutor Brief; answers are already stored, so only the optional whiteboard is sent. */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const whiteboardEntry = formData.get('whiteboard');

    let whiteboardPng: Buffer | null = null;
    if (whiteboardEntry instanceof File) {
      if (whiteboardEntry.type !== 'image/png') {
        throw new ApiError(400, 'INVALID_INPUT', 'whiteboard must be image/png');
      }
      whiteboardPng = Buffer.from(await whiteboardEntry.arrayBuffer());
    }

    const brief = await submitBrief({ whiteboardPng });
    return Response.json({ brief }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
