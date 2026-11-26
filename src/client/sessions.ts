import type { TutorSession, PublicSessionSummary } from '@/contracts/sessions';
import { parseErrorResponse } from './http';

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
