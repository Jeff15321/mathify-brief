import { generateNextProbePair } from '@/server/probe-service';
import { toApiErrorResponse } from '@/server/errors';

export const runtime = 'nodejs';

/** Prefetches the next probe pair within the buffer window; a no-op when nothing is needed. */
export async function POST() {
  try {
    const probing = await generateNextProbePair();
    return Response.json({ probing }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
