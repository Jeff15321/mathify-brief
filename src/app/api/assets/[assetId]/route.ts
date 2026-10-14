import { getStores } from '@/server/storage';
import { ApiError, toApiErrorResponse } from '@/server/errors';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  try {
    const { assetId } = await params;
    const { assetStore } = getStores();
    const result = await assetStore.get(assetId);

    if (!result) {
      throw new ApiError(404, 'NOT_FOUND', 'Asset not found');
    }

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
