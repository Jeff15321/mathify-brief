import type { PublicWorkspace } from '@/contracts/workspace';
import type { ProbeAnswer, PublicProbing } from '@/contracts/probes';
import type { BriefHistory, TutorBrief } from '@/contracts/brief';
import { parseErrorResponse } from './http';

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

/** "Relevant from past sessions" for the current brief; generated on the first call, then cached. */
export async function fetchBriefHistory(workspaceId: string): Promise<BriefHistory> {
  const res = await fetch('/api/brief/history', { method: 'POST', headers: { 'x-workspace-id': workspaceId } });
  if (!res.ok) await parseErrorResponse(res);
  return (await res.json()).history;
}
