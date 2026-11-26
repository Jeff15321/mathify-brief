import { requestWorkspaceId } from '@/server/workspace/identity';
import { getBriefHistory } from '@/server/brief/service';
import { toApiErrorResponse } from '@/server/errors';

export const runtime = 'nodejs';

/** "Relevant from past sessions" for the current brief; computed once, then served from the brief. */
export async function POST(request: Request) {
  try {
    const history = await getBriefHistory(requestWorkspaceId(request));
    return Response.json({ history }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
