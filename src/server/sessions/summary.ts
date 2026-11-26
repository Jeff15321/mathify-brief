import { modelLabel, summaryModel } from '@/server/ai/models';
import { SESSION_SUMMARY_PROMPT_VERSION } from '@/server/ai/prompts';
import { getAnalysisProvider } from '@/server/ai';
import type { StoredFile } from '@/server/ai/provider';
import { getStores, type Stores } from '@/server/storage';
import { ApiError } from '@/server/errors';
import { modelSessionSummarySchema } from '@/schemas/session';
import { DEMO_PROFILE } from '@/contracts/profile';
import type { TutorSession } from '@/contracts/sessions';

/**
 * Claims the session (`pending` + `summaryStartedAt`), summarizes it outside the lock and stores the
 * result as `ready`, or `failed` on error. A claim younger than 2 minutes is left alone.
 * @returns The session as stored after this call.
 */
export async function summarizeStoredSession(id: string, stores: Stores = getStores()): Promise<TutorSession> {
  const { sessionStore } = stores;
  const startedAt = new Date().toISOString();
  let ownsClaim = false;
  const session = await sessionStore.update(id, (current) => {
    if (current.status === 'pending' && current.summaryStartedAt && Date.now() - Date.parse(current.summaryStartedAt) < 120_000) return current;
    ownsClaim = true;
    return { ...current, status: 'pending', summaryStartedAt: startedAt, updatedAt: startedAt };
  });
  if (!ownsClaim) return session;

  try {
    const whiteboards: StoredFile[] = [];
    for (const asset of session.whiteboards) {
      const loaded = await sessionStore.readAsset(id, asset.id);
      if (!loaded) throw new ApiError(500, 'INTERNAL_ERROR', `Whiteboard ${asset.id} is missing from storage`);
      whiteboards.push({ fileName: loaded.meta.fileName, mimeType: loaded.meta.mimeType, bytes: loaded.bytes });
    }

    let raw;
    try {
      raw = await getAnalysisProvider().summarizeSession({
        grade: DEMO_PROFILE.grade,
        sessionDate: session.sessionDate,
        transcriptText: session.transcriptText,
        tutorNotes: session.tutorNotes,
        whiteboards,
      });
    } catch {
      throw new ApiError(502, 'AI_PROVIDER_ERROR', 'The session summary could not be completed. Please retry.');
    }
    const parsed = modelSessionSummarySchema.safeParse(raw);
    if (!parsed.success) throw new ApiError(502, 'AI_PROVIDER_ERROR', 'The session summary could not be validated. Please retry.');

    return await sessionStore.update(id, (current) => {
      if (current.summaryStartedAt !== startedAt) return current;
      const now = new Date().toISOString();
      return {
        ...current,
        status: 'ready',
        title: parsed.data.title,
        summary: parsed.data.summary,
        observations: parsed.data.observations,
        model: modelLabel(summaryModel()),
        promptVersion: SESSION_SUMMARY_PROMPT_VERSION,
        summarizedAt: now,
        updatedAt: now,
      };
    });
  } catch (error) {
    await sessionStore.update(id, (current) => {
      if (current.summaryStartedAt !== startedAt) return current;
      return { ...current, status: 'failed', updatedAt: new Date().toISOString() };
    }).catch(() => {});
    throw error;
  }
}
