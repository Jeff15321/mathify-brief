import type { LearnerProfile } from '@/contracts/profile';
import type { ProfileUpdate } from '@/schemas/profile';
import { parseErrorResponse } from './http';

export async function fetchProfile(): Promise<LearnerProfile> {
  const res = await fetch('/api/profile', { cache: 'no-store' });
  if (!res.ok) await parseErrorResponse(res);
  return (await res.json()).profile;
}

/** Upserted items (including edited AI items) are saved as `source: 'tutor'`. */
export async function updateProfile(changes: ProfileUpdate): Promise<LearnerProfile> {
  const res = await fetch('/api/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  });
  if (!res.ok) await parseErrorResponse(res);
  return (await res.json()).profile;
}

export async function rebuildProfile(): Promise<LearnerProfile> {
  const res = await fetch('/api/profile/rebuild', { method: 'POST' });
  if (!res.ok) await parseErrorResponse(res);
  return (await res.json()).profile;
}
