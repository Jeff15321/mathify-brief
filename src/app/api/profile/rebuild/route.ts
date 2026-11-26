import { rebuildProfile } from '@/server/profile/service';
import { toApiErrorResponse } from '@/server/errors';

export const runtime = 'nodejs';

/** Rebuilds the AI items now; on failure the previous profile is kept with `rebuildStatus: 'failed'`. */
export async function POST() {
  try {
    return Response.json({ profile: await rebuildProfile() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
