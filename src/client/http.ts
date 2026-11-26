export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
  }
}

export async function parseErrorResponse(res: Response): Promise<never> {
  let message = `Request failed with status ${res.status}`;
  let code: string | undefined;
  try {
    const body = await res.json();
    if (body?.error?.message) message = body.error.message;
    if (body?.error?.code) code = body.error.code;
  } catch {
    // ignore unparsable error body
  }
  throw new ApiClientError(message, code);
}
