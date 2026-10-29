export type ApiErrorCode =
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'INVALID_STATE'
  | 'AI_PROVIDER_ERROR'
  | 'INTERNAL_ERROR'
  | 'FORBIDDEN';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export function apiErrorResponse(error: ApiError): Response {
  return Response.json(
    { error: { code: error.code, message: error.message } },
    { status: error.status, headers: { 'Cache-Control': 'no-store' } },
  );
}

export function toApiErrorResponse(err: unknown): Response {
  if (err instanceof ApiError) {
    return apiErrorResponse(err);
  }
  // Unexpected failure: log server-side detail, never leak stack traces to the client.
  console.error('Unexpected server error:', err);
  return apiErrorResponse(
    new ApiError(500, 'INTERNAL_ERROR', 'An unexpected server error occurred.'),
  );
}
