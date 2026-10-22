import type { ProbeAnswer, PublicProbing, PublicWorkspace, TutorBrief } from '@/types/domain';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
  }
}

async function parseErrorResponse(res: Response): Promise<never> {
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

export async function fetchWorkspace(): Promise<PublicWorkspace | null> {
  const res = await fetch('/api/workspace', { cache: 'no-store' });
  if (!res.ok) await parseErrorResponse(res);
  const body = await res.json();
  return body.workspace;
}

export async function startWorkspace(questionText: string, files: File[]): Promise<void> {
  const formData = new FormData();
  formData.set('questionText', questionText);
  for (const file of files) {
    formData.append('files', file);
  }

  const res = await fetch('/api/workspace/start', { method: 'POST', body: formData });
  if (!res.ok) await parseErrorResponse(res);
}

export async function analyzeQuestion(): Promise<void> {
  const res = await fetch('/api/analyze', { method: 'POST' });
  if (!res.ok) await parseErrorResponse(res);
}

/** Asks the server to prefetch the next probe pair; resolves with the latest probing state. */
export async function generateNextProbes(): Promise<PublicProbing> {
  const res = await fetch('/api/probes/generate', { method: 'POST' });
  if (!res.ok) await parseErrorResponse(res);
  const body = await res.json();
  return body.probing;
}

/** Submits the answer to the probe on screen; resolves with the next probing state. */
export async function answerProbe(probeId: string, answer: ProbeAnswer): Promise<PublicProbing> {
  const res = await fetch('/api/probes/answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ probeId, answer }),
  });
  if (!res.ok) await parseErrorResponse(res);
  const body = await res.json();
  return body.probing;
}

/** Ends probing and generates the Tutor Brief, attaching the whiteboard PNG when it is not blank. */
export async function submitBrief(whiteboardPng: Blob | null): Promise<TutorBrief> {
  const formData = new FormData();
  if (whiteboardPng) {
    formData.set('whiteboard', whiteboardPng, 'whiteboard.png');
  }

  const res = await fetch('/api/brief', { method: 'POST', body: formData });
  if (!res.ok) await parseErrorResponse(res);
  const body = await res.json();
  return body.brief;
}
