import { deleteSession, getSession, updateSession } from '@/server/session-service';
import { ApiError, toApiErrorResponse } from '@/server/errors';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const session = await getSession((await params).id);
    return Response.json({ session }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, 'INVALID_INPUT', 'Body must be JSON');
    }
    const session = await updateSession((await params).id, body);
    return Response.json({ session }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    await deleteSession((await params).id);
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
