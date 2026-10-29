import { z } from 'zod';
import { probeAnswerSchema } from '@/schemas/workspace';
import { answerCurrentProbe } from '@/server/probe-service';
import { ApiError, toApiErrorResponse } from '@/server/errors';

export const runtime = 'nodejs';

const answerRequestSchema = z.object({
  probeId: z.string().min(1),
  answer: probeAnswerSchema,
  shownAt: z.string().nullable().optional(),
});

/** Records the answer to the current probe and returns the next one (or a waiting state). */
export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, 'INVALID_INPUT', 'Body must be JSON');
    }
    const parsed = answerRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, 'INVALID_INPUT', `Invalid answer: ${parsed.error.message}`);
    }

    const probing = await answerCurrentProbe({
      probeId: parsed.data.probeId,
      answer: parsed.data.answer,
      shownAt: parsed.data.shownAt ?? null,
    });
    return Response.json({ probing }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
