import type { ProbeAnswer, PublicProbing, PublicSessionSummary, PublicWorkspace, TutorBrief, TutorSession } from '@/types/domain';

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

export async function startWorkspace(questionText: string, files: File[], draftId: string, expectedWorkspaceId: string | null): Promise<string> {
  const formData = new FormData();
  formData.set('questionText', questionText);
  formData.set('draftId', draftId);
  formData.set('expectedWorkspaceId', expectedWorkspaceId ?? '');
  for (const file of files) {
    formData.append('files', file);
  }

  const res = await fetch('/api/workspace/start', { method: 'POST', body: formData });
  if (!res.ok) await parseErrorResponse(res);
  return (await res.json()).workspaceId;
}

export async function analyzeQuestion(workspaceId: string): Promise<void> {
  const res = await fetch('/api/analyze', { method: 'POST', headers: { 'x-workspace-id': workspaceId } });
  if (!res.ok) await parseErrorResponse(res);
}

/** Asks the server to prefetch the next probe pair; resolves with the latest probing state. */
export async function generateNextProbes(workspaceId: string): Promise<PublicProbing> {
  const res = await fetch('/api/probes/generate', { method: 'POST', headers: { 'x-workspace-id': workspaceId } });
  if (!res.ok) await parseErrorResponse(res);
  const body = await res.json();
  return body.probing;
}

/** Submits the answer to the probe on screen; resolves with the next probing state. */
export async function answerProbe(probeId: string, answer: ProbeAnswer, workspaceId: string, hintOpened = false): Promise<PublicProbing> {
  const res = await fetch('/api/probes/answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-workspace-id': workspaceId },
    body: JSON.stringify({ probeId, answer, hintOpened }),
  });
  if (!res.ok) await parseErrorResponse(res);
  const body = await res.json();
  return body.probing;
}

/** Ends probing and generates the Tutor Brief, attaching the whiteboard PNG when it is not blank. */
export async function submitBrief(whiteboardPng: Blob | null, workspaceId: string, submissionId: string, pending?: { probeId: string; answer: ProbeAnswer | null; hintOpened?: boolean }, exportOmitted = false): Promise<TutorBrief> {
  const formData = new FormData();
  if (whiteboardPng) {
    formData.set('whiteboard', whiteboardPng, 'whiteboard.png');
  }

  formData.set('submissionId', submissionId);
  if (pending) formData.set('pending', JSON.stringify(pending));
  formData.set('exportOmitted', String(exportOmitted));
  const res = await fetch('/api/brief', { method: 'POST', headers: { 'x-workspace-id': workspaceId }, body: formData });
  if (!res.ok) await parseErrorResponse(res);
  const body = await res.json();
  return body.brief;
}

export async function fetchSessions(): Promise<PublicSessionSummary[]> {
  const res = await fetch('/api/sessions', { cache: 'no-store' });
  if (!res.ok) await parseErrorResponse(res);
  return (await res.json()).sessions;
}

export async function fetchSession(id: string): Promise<TutorSession> {
  const res = await fetch(`/api/sessions/${encodeURIComponent(id)}`, { cache: 'no-store' });
  if (!res.ok) await parseErrorResponse(res);
  return (await res.json()).session;
}

/** Uploads `transcript`, `whiteboards`, `sessionDate` and `tutorNotes`; resolves even if the summary failed. */
export async function uploadSession(formData: FormData): Promise<TutorSession> {
  const res = await fetch('/api/sessions', { method: 'POST', body: formData });
  if (!res.ok) await parseErrorResponse(res);
  return (await res.json()).session;
}

export async function updateSession(id: string, changes: { sessionDate?: string; tutorNotes?: string }): Promise<TutorSession> {
  const res = await fetch(`/api/sessions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  });
  if (!res.ok) await parseErrorResponse(res);
  return (await res.json()).session;
}

export async function deleteSession(id: string): Promise<void> {
  const res = await fetch(`/api/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) await parseErrorResponse(res);
}

export async function retrySessionSummary(id: string): Promise<TutorSession> {
  const res = await fetch(`/api/sessions/${encodeURIComponent(id)}/summarize`, { method: 'POST' });
  if (!res.ok) await parseErrorResponse(res);
  return (await res.json()).session;
}
