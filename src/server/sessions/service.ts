import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { z } from 'zod';
import { MAX_SESSION_WHITEBOARDS, MAX_TRANSCRIPT_BYTES, TRANSCRIPT_EXTENSIONS } from '@/contracts/limits';
import { localToday, sessionDateSchema, sessionUpdateSchema, tutorNotesSchema } from '@/schemas/session';
import type { PublicSessionSummary, TutorSession } from '@/contracts/sessions';
import type { StoredAsset } from '@/contracts/assets';
import { validateFileCandidate, type UploadCandidate } from '@/server/upload-validation';
import { summarizeStoredSession } from './summary';
import { rebuildProfile } from '@/server/profile/service';
import { isAllowedMimeType, isImageMimeType } from '@/contracts/assets';
import type { WhiteboardFile } from '@/server/storage/contracts';
import { ApiError } from '@/server/errors';
import { getStores, type Stores } from '@/server/storage';

export interface CreateSessionInput {
  transcript: UploadCandidate | null;
  whiteboards: UploadCandidate[];
  sessionDate?: string;
  tutorNotes?: string;
}

function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new ApiError(400, 'INVALID_INPUT', parsed.error.issues.map((issue) => issue.message).join('; '));
  return parsed.data;
}

function decodeTranscript(file: UploadCandidate | null): string {
  if (!file) throw new ApiError(400, 'INVALID_INPUT', 'A transcript file is required');
  if (!(TRANSCRIPT_EXTENSIONS as readonly string[]).includes(path.extname(file.fileName).toLowerCase())) {
    throw new ApiError(400, 'INVALID_INPUT', `Transcript must be one of ${TRANSCRIPT_EXTENSIONS.join(', ')}`);
  }
  if (file.bytes.byteLength > MAX_TRANSCRIPT_BYTES) throw new ApiError(400, 'INVALID_INPUT', `Transcript exceeds ${MAX_TRANSCRIPT_BYTES} bytes`);
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(file.bytes);
  } catch {
    throw new ApiError(400, 'INVALID_INPUT', 'Transcript must be UTF-8 text');
  }
  if (text.trim().length === 0) throw new ApiError(400, 'INVALID_INPUT', 'Transcript is empty');
  return text;
}

function validateWhiteboards(files: UploadCandidate[]): asserts files is WhiteboardFile[] {
  const errors: string[] = [];
  if (files.length > MAX_SESSION_WHITEBOARDS) errors.push(`At most ${MAX_SESSION_WHITEBOARDS} whiteboards are allowed per session`);
  for (const file of files) {
    if (isAllowedMimeType(file.mimeType) && !isImageMimeType(file.mimeType)) errors.push(`${file.fileName}: whiteboards must be PNG, JPEG or WebP images`);
    else errors.push(...validateFileCandidate(file));
  }
  if (errors.length > 0) throw new ApiError(400, 'INVALID_INPUT', errors.join('; '));
}

/** Rebuilds the learner profile after sessions are summarized, edited or deleted; never fails the caller. */
async function afterSessionsChanged(stores: Stores): Promise<void> {
  try {
    await rebuildProfile(stores);
  } catch (error) {
    console.error('Learner profile rebuild failed:', error);
  }
}

/**
 * Validates and saves the session as `pending` first, then summarizes it, so an AI failure never
 * loses the upload. @returns The stored session, `failed` if the summary failed.
 */
export async function createSession(input: CreateSessionInput, stores: Stores = getStores()): Promise<TutorSession> {
  const transcriptText = decodeTranscript(input.transcript);
  validateWhiteboards(input.whiteboards);
  const sessionDate = parseOrThrow(sessionDateSchema, input.sessionDate || localToday());
  const tutorNotes = parseOrThrow(tutorNotesSchema, input.tutorNotes ?? '');

  const now = new Date().toISOString();
  const { id } = await stores.sessionStore.create(
    {
      schemaVersion: 1, id: randomUUID(), sessionDate, uploadedAt: now, updatedAt: now, tutorNotes,
      transcriptFileName: input.transcript!.fileName, transcriptText,
      status: 'pending', summaryStartedAt: null, title: null, summary: null, observations: [],
      model: null, promptVersion: null, summarizedAt: null,
    },
    input.whiteboards,
  );
  try {
    return await summarizeSessionAndNotify(id, stores);
  } catch (error) {
    if (!(error instanceof ApiError)) console.error('Session summary failed:', error);
    return getSession(id, stores);
  }
}

async function summarizeSessionAndNotify(id: string, stores: Stores): Promise<TutorSession> {
  const session = await summarizeStoredSession(id, stores);
  if (session.status === 'ready') await afterSessionsChanged(stores);
  return session;
}

/** Retries the summary of a `pending` (stale) or `failed` session. */
export async function retrySessionSummary(id: string, stores: Stores = getStores()): Promise<TutorSession> {
  const session = await getSession(id, stores);
  if (session.status === 'ready') throw new ApiError(409, 'INVALID_STATE', 'This session is already summarized');
  return summarizeSessionAndNotify(id, stores);
}

export async function listSessions(stores: Stores = getStores()): Promise<PublicSessionSummary[]> {
  return (await stores.sessionStore.list()).map((session) => ({
    id: session.id,
    title: session.title,
    summary: session.summary,
    sessionDate: session.sessionDate,
    status: session.status,
    whiteboardCount: session.whiteboards.length,
    observationCount: session.observations.length,
  }));
}

export async function getSession(id: string, stores: Stores = getStores()): Promise<TutorSession> {
  const session = await stores.sessionStore.read(id);
  if (!session) throw new ApiError(404, 'NOT_FOUND', 'Session not found');
  return session;
}

export async function updateSession(id: string, input: unknown, stores: Stores = getStores()): Promise<TutorSession> {
  const changes = parseOrThrow(sessionUpdateSchema, input);
  const session = await stores.sessionStore.update(id, (current) => ({ ...current, ...changes, updatedAt: new Date().toISOString() }));
  await afterSessionsChanged(stores);
  return session;
}

export async function deleteSession(id: string, stores: Stores = getStores()): Promise<void> {
  await getSession(id, stores);
  await stores.sessionStore.remove(id);
  await afterSessionsChanged(stores);
}

export async function getSessionAsset(id: string, assetId: string, stores: Stores = getStores()): Promise<{ meta: StoredAsset; bytes: Buffer }> {
  const asset = await stores.sessionStore.readAsset(id, assetId);
  if (!asset) throw new ApiError(404, 'NOT_FOUND', 'Asset not found');
  return asset;
}
