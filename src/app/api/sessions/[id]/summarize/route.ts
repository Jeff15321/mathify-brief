import { retrySessionSummary } from '@/server/session-service';
import { toApiErrorResponse } from '@/server/errors';

export const runtime = 'nodejs';

/** Retries a failed or stale summary; 409 when the session is already `ready`. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await retrySessionSummary((await params).id);
    return Response.json({ session }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
