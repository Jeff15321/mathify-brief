import { z } from 'zod';
import { probeAnswerSchema } from '@/schemas/workspace';
import { requestWorkspaceId } from '@/server/workspace-identity';
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

    const workspaceId = requestWorkspaceId(request);
    const submissionId = z.uuid().safeParse(formData.get('submissionId'));
    if (!submissionId.success) throw new ApiError(400, 'INVALID_INPUT', 'A submission identity is required');
    let pending;
    const raw = formData.get('pending');
    if (raw) {
      try { pending = z.object({ probeId: z.string().min(1), answer: probeAnswerSchema, hintOpened: z.boolean().optional() }).parse(JSON.parse(String(raw))); }
      catch { throw new ApiError(400, 'INVALID_INPUT', 'Invalid selected answer'); }
    }
    const brief = await submitBrief({ workspaceId, submissionId: submissionId.data, pending, whiteboardPng, exportOmitted: formData.get('exportOmitted') === 'true' });
    return Response.json({ brief }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
