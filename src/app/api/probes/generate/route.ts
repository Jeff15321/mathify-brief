import { requestWorkspaceId } from '@/server/workspace-identity';
import { generateNextProbePair } from '@/server/probe-service';
import { toApiErrorResponse } from '@/server/errors';

export const runtime = 'nodejs';

/** Prefetches the next probe pair within the buffer window; a no-op when nothing is needed. */
export async function POST(request: Request) {
  try {
    const probing = await generateNextProbePair(undefined, requestWorkspaceId(request));
    return Response.json({ probing }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
