import { getProfile, updateProfile } from '@/server/profile/service';
import { ApiError, toApiErrorResponse } from '@/server/errors';

export const runtime = 'nodejs';

export async function GET() {
  try {
    return Response.json({ profile: await getProfile() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}

export async function PATCH(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, 'INVALID_INPUT', 'Body must be JSON');
    }
    return Response.json({ profile: await updateProfile(body) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
