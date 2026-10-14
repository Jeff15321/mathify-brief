import { getPublicWorkspace } from '@/server/workspace-service';
import { toApiErrorResponse } from '@/server/errors';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const workspace = await getPublicWorkspace();
    return Response.json({ workspace }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
