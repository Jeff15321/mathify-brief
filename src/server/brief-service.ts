import { randomUUID } from 'node:crypto';
import type { ProbeAnswer, StoredAsset, TutorBrief } from '@/types/domain';
import { getStores, type createStores } from './storage';
import { ApiError } from './errors';
import { assertWorkspaceId } from './workspace-identity';
import { MAX_WHITEBOARD_SIZE_BYTES } from '@/lib/constants';
import { computeResults, currentProbe } from './helpers/probe-flow-helper';
import { summarizeBrief } from './helpers/brief-summary-helper';

type Stores = ReturnType<typeof createStores>;
export interface SubmitBriefInput {
  workspaceId?: string;
  submissionId?: string;
  pending?: { probeId: string; answer: ProbeAnswer | null; hintOpened?: boolean };
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
