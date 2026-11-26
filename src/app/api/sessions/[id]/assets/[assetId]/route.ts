import { getSessionAsset } from '@/server/sessions/service';
import { toApiErrorResponse } from '@/server/errors';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; assetId: string }> },
) {
  try {
    const { id, assetId } = await params;
    const result = await getSessionAsset(id, assetId);

    return new Response(new Uint8Array(result.bytes), {
      status: 200,
      headers: {
        'Content-Type': result.meta.mimeType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
