import { requestWorkspaceId } from '@/server/workspace-identity';
import { analyzeCurrentWorkspace } from '@/server/analysis-service';
import { toApiErrorResponse } from '@/server/errors';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const analysis = await analyzeCurrentWorkspace(undefined, requestWorkspaceId(request));
    return Response.json({ analysis }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
