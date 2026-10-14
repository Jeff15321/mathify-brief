export const runtime = 'nodejs';

export async function GET() {
  // Stage 0: temporary placeholder response, replaced by LocalWorkspaceStore in Stage 1.
  return Response.json(
    { workspace: null },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
