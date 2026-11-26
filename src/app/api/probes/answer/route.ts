import { requestWorkspaceId } from '@/server/workspace/identity';
import { answerRequestSchema } from '@/schemas/probes';
import { answerCurrentProbe } from '@/server/workspace/probes';
import { ApiError, toApiErrorResponse } from '@/server/errors';

export const runtime = 'nodejs';

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

    const probing = await answerCurrentProbe({ ...parsed.data, workspaceId: requestWorkspaceId(request) });
    return Response.json({ probing }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
