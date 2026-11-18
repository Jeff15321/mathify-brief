import { randomUUID } from 'node:crypto';
import { PROFILE_PROMPT_VERSION } from './ai/prompts';
import { getAnalysisProvider } from './ai';
import { resolveSummaryModelLabel } from './session-summary-service';
import { getStores, type createStores } from './storage';
import { ApiError } from './errors';
import { modelLearnerProfileSchema, profileUpdateSchema, type ModelLearnerProfile } from '@/schemas/profile';
import { DEMO_PROFILE, type LearnerProfile, type LearnerProfileItem, type ProfileEvidence } from '@/types/domain';

type Stores = ReturnType<typeof createStores>;

const rebuilds = new WeakMap<object, Promise<unknown>>();

const normalize = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ');

export async function getProfile(stores: Stores = getStores()): Promise<LearnerProfile> {
  return stores.profileStore.read();
}

/** Applies tutor edits; every upserted item, including an edited AI item, becomes `source: 'tutor'`. */
export async function updateProfile(input: unknown, stores: Stores = getStores()): Promise<LearnerProfile> {
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) throw new ApiError(400, 'INVALID_INPUT', parsed.error.issues.map((issue) => issue.message).join('; '));
  const { upsertItems = [], deleteItemIds = [], ...fields } = parsed.data;

  return stores.profileStore.update((current) => {
    let items = current.items.filter((item) => !deleteItemIds.includes(item.id));
    for (const { id = randomUUID(), ...edit } of upsertItems) {
      const existing = items.find((item) => item.id === id);
      const originText = existing?.source === 'ai' ? existing.text : existing?.originText;
      const next: LearnerProfileItem = { evidence: existing?.evidence ?? [], ...edit, id, source: 'tutor', ...(originText ? { originText } : {}) };
      items = existing ? items.map((item) => (item === existing ? next : item)) : [...items, next];
    }
    const focus = fields.nextFocus === undefined ? {} : { nextFocusSource: fields.nextFocus ? 'tutor' as const : 'ai' as const };
    return { ...current, ...fields, ...focus, items, updatedAt: new Date().toISOString() };
  });
}

/**
 * Rebuilds the AI items from every `ready` session. Rebuilds are serialized; tutor items are kept
 * (minus evidence for deleted sessions). On failure the previous profile is kept as `failed`.
 */
export function rebuildProfile(stores: Stores = getStores()): Promise<LearnerProfile> {
  const run = (rebuilds.get(stores.profileStore) ?? Promise.resolve()).then(() => runRebuild(stores));
  rebuilds.set(stores.profileStore, run.catch(() => undefined));
  return run;
}

async function runRebuild({ profileStore, sessionStore }: Stores): Promise<LearnerProfile> {
  const profile = await profileStore.update((current) => ({ ...current, rebuildStatus: 'rebuilding' }));
  try {
    const sessions = (await sessionStore.list()).filter((session) => session.status === 'ready').reverse();
    const dates = new Map(sessions.map((session) => [session.id, session.sessionDate]));
    const withSessionDates = (evidence: { sessionId: string; quote?: string }[]): ProfileEvidence[] => evidence
      .filter((entry) => dates.has(entry.sessionId))
      .map((entry) => ({ ...entry, date: dates.get(entry.sessionId)! }));

    let output: ModelLearnerProfile = { nextFocus: '', items: [] };
    if (sessions.length > 0) {
      let raw;
      try {
        raw = await getAnalysisProvider().buildLearnerProfile({
          grade: DEMO_PROFILE.grade,
          currentItems: profile.items.map(({ source, category, text, status }) => ({ source, category, text, status })),
          tutorNotes: profile.tutorNotes,
          tutorNextFocus: profile.nextFocusSource === 'tutor' ? profile.nextFocus : '',
          sessions: sessions.map((session) => ({ sessionId: session.id, date: session.sessionDate, title: session.title, observations: session.observations })),
        });
      } catch {
        throw new ApiError(502, 'AI_PROVIDER_ERROR', 'The learner profile could not be rebuilt. Please retry.');
      }
      const parsed = modelLearnerProfileSchema.safeParse(raw);
      if (!parsed.success) throw new ApiError(502, 'AI_PROVIDER_ERROR', 'The learner profile could not be validated. Please retry.');
      output = parsed.data;
    }

    const aiItems: LearnerProfileItem[] = output.items
      .map((item) => ({ ...item, id: randomUUID(), source: 'ai' as const, evidence: withSessionDates(item.evidence) }))
      .filter((item) => item.evidence.length > 0);
    return await profileStore.update((current) => {
      const now = new Date().toISOString();
      const tutorItems = current.items
        .filter((item) => item.source === 'tutor')
        .map((item) => ({ ...item, evidence: withSessionDates(item.evidence) }));
      const tutorTexts = new Set(tutorItems.flatMap((item) => [item.text, item.originText ?? ''].map((text) => `${item.category}:${normalize(text)}`)));
      const newAiItems = aiItems.filter((item) => !tutorTexts.has(`${item.category}:${normalize(item.text)}`));
      return {
        ...current, nextFocus: current.nextFocusSource === 'tutor' ? current.nextFocus : output.nextFocus, items: [...tutorItems, ...newAiItems], updatedAt: now, rebuiltAt: now,
        rebuildStatus: 'idle', model: resolveSummaryModelLabel(), promptVersion: PROFILE_PROMPT_VERSION,
      };
    });
  } catch (error) {
    await profileStore.update((current) => ({ ...current, rebuildStatus: 'failed' })).catch(() => {});
    throw error;
  }
}
