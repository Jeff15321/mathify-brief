import { analyzeCurrentWorkspace } from '@/server/analysis-service';
import { toApiErrorResponse } from '@/server/errors';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const analysis = await analyzeCurrentWorkspace();
    return Response.json({ analysis }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
