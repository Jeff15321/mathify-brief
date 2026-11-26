import { modelLabel, summaryModel } from '@/server/ai/models';
import { randomUUID } from 'node:crypto';
import type { BriefHistory, TutorBrief } from '@/contracts/brief';
import type { PendingAnswer } from '@/schemas/probes';
import type { StoredAsset } from '@/contracts/assets';
import { modelHistorySchema } from '@/schemas/brief';
import { getAnalysisProvider } from '@/server/ai';
import { HISTORY_PROMPT_VERSION } from '@/server/ai/prompts';
import { getStores, type Stores } from '@/server/storage';
import { ApiError } from '@/server/errors';
import { assertWorkspaceId } from '@/server/workspace/identity';
import { MAX_WHITEBOARD_SIZE_BYTES } from '@/contracts/limits';
import { computeResults, currentProbe } from '@/server/workspace/probe-flow';
import { summarizeBrief } from './scoring';

export interface SubmitBriefInput {
  workspaceId?: string;
  submissionId?: string;
  pending?: PendingAnswer;
  whiteboardPng: Buffer | null;
  exportOmitted?: boolean;
}

/** Stage slow asset I/O, then save the pending answer and brief in one serialized update. */
export async function submitBrief(input: SubmitBriefInput, stores: Stores = getStores()): Promise<TutorBrief> {
  const { workspaceStore, assetStore } = stores;
  const initial = await workspaceStore.read();
  assertWorkspaceId(initial, input.workspaceId);
  if (!initial?.analysis) throw new ApiError(404, 'NOT_FOUND', 'No analyzed workspace to submit');
  if (initial.phase === 'complete' && input.submissionId && initial.submissionId === input.submissionId) return initial.brief!;
  if (initial.phase !== 'ready') throw new ApiError(409, 'INVALID_STATE', 'The brief has already been submitted');
  if (input.whiteboardPng && input.whiteboardPng.byteLength > MAX_WHITEBOARD_SIZE_BYTES) {
    throw new ApiError(400, 'INVALID_INPUT', `Whiteboard image exceeds ${MAX_WHITEBOARD_SIZE_BYTES} bytes`);
  }
  let staged: StoredAsset | null = null;
  let referenced = false;
  try {
    if (input.whiteboardPng) staged = await assetStore.put({ kind: 'whiteboard', fileName: 'whiteboard.png', mimeType: 'image/png', bytes: input.whiteboardPng });
    const saved = await workspaceStore.update(current => {
      assertWorkspaceId(current, initial.workspaceId);
      if (!current) throw new ApiError(404, 'NOT_FOUND', 'Workspace no longer exists');
      if (current.phase === 'complete' && input.submissionId && current.submissionId === input.submissionId) return current;
      if (current.phase !== 'ready') throw new ApiError(409, 'INVALID_STATE', 'The brief has already been submitted');
      let steps = current.probeSteps;
      if (input.pending) {
        const probe = currentProbe(steps, current.cursor);
        if (!current.cursor || probe?.id !== input.pending.probeId) throw new ApiError(409, 'INVALID_STATE', 'The selected question changed. Reload before finishing.');
        const field = current.cursor.kind === 'main' ? 'mainAnswer' : 'easierAnswer';
        const hintField = current.cursor.kind === 'main' ? 'mainHintOpened' : 'easierHintOpened';
        steps = steps.map(step => step.index === current.cursor!.stepIndex ? { ...step, [field]: input.pending!.answer, [hintField]: step[hintField] || input.pending!.hintOpened || false } : step);
        // Do not advance: Finish must not mark a follow-up as shown.
      }
      const { results, notReachedConcepts } = computeResults(steps, current.cursor);
      const brief: TutorBrief = {
        reportId: randomUUID(), results, notReachedConcepts,
        ...summarizeBrief(results, notReachedConcepts), generatedAt: new Date().toISOString(), briefVersion: 6,
      };
      return { ...current, probeSteps: steps, brief, phase: 'complete',
        submissionId: input.submissionId ?? randomUUID(), whiteboardAsset: staged,
        whiteboardState: staged ? 'attached' : input.exportOmitted ? 'omitted' : 'none', updatedAt: brief.generatedAt };
    });
    referenced = staged !== null && saved.whiteboardAsset?.id === staged.id;
    return saved.brief!;
  } finally {
    // A losing/rejected request owns only its staged asset, never another workspace's assets.
    if (staged && !referenced) await assetStore.remove(staged).catch(() => {});
  }
}

/**
 * Connects the learner profile to the current brief, once: the result (or failure) is saved on the
 * brief. An empty profile skips the AI. A report replaced during the AI call is not updated.
 */
export async function getBriefHistory(workspaceId: string | undefined, stores: Stores = getStores()): Promise<BriefHistory> {
  const { workspaceStore, profileStore } = stores;
  const initial = await workspaceStore.read();
  assertWorkspaceId(initial, workspaceId);
  const brief = initial?.brief;
  if (!initial?.analysis || !brief) throw new ApiError(404, 'NOT_FOUND', 'No Tutor Brief to compare with past sessions');
  if (brief.history) return brief.history;

  const profile = await profileStore.read();
  let history: BriefHistory = { status: 'ready', bullets: [], generatedAt: new Date().toISOString(), model: 'none', promptVersion: HISTORY_PROMPT_VERSION };
  if (profile.items.length > 0) {
    try {
      const output = modelHistorySchema.parse(await getAnalysisProvider().relevantHistory({
        grade: initial.demoProfile.grade, parsedQuestionMarkdown: initial.analysis.parsedQuestionMarkdown, topic: initial.analysis.topic,
        results: brief.results, notReachedConcepts: brief.notReachedConcepts,
        profile: { items: profile.items.map(({ category, text, status, evidence }) => ({ category, text, status, evidence })), nextFocus: profile.nextFocus, tutorNotes: profile.tutorNotes },
      }));
      history = { ...history, bullets: output.bullets, generatedAt: new Date().toISOString(), model: modelLabel(summaryModel()) };
    } catch (error) {
      console.error('Relevant history failed:', error);
      history = { status: 'failed' };
    }
  }

  const saved = await workspaceStore.update(current => {
    const currentBrief = current?.workspaceId === initial.workspaceId ? current.brief : null;
    if (!current || !currentBrief || currentBrief.reportId !== brief.reportId || currentBrief.generatedAt !== brief.generatedAt) {
      throw new ApiError(409, 'INVALID_STATE', 'The report changed. Reload to see the current report.');
    }
    return currentBrief.history ? current : { ...current, brief: { ...currentBrief, history } };
  });
  return saved.brief!.history!;
}
