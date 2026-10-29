import type { ProbeStep, TutorBrief } from '@/types/domain';
import { getStores, type createStores } from './storage';
import { ApiError } from './errors';
import { MAX_WHITEBOARD_SIZE_BYTES } from '@/lib/constants';
import { computeResults } from './helpers/probe-flow-helper';
import { summarizeBrief } from './helpers/brief-summary-helper';
import { computeConfidence } from './helpers/confidence-helper';

type Stores = ReturnType<typeof createStores>;

export interface SubmitBriefInput {
  whiteboardPng: Buffer | null;
}

/**
 * Ends probing and builds the Tutor Brief deterministically from the stored answers (no AI call).
 * The client only sends the optional whiteboard. Allowed at any point (early submit): the probe on
 * screen counts as unanswered and steps not reached are listed separately.
 */
export async function submitBrief(input: SubmitBriefInput, stores: Stores = getStores()): Promise<TutorBrief> {
  const { workspaceStore, assetStore } = stores;
  const workspace = await workspaceStore.read();

  if (!workspace || !workspace.analysis) {
    throw new ApiError(404, 'NOT_FOUND', 'No analyzed workspace to submit a brief for');
  }
  if (workspace.phase === 'complete') {
    throw new ApiError(409, 'INVALID_STATE', 'A Tutor Brief has already been generated for this workspace');
  }
  if (workspace.phase !== 'ready') {
    throw new ApiError(409, 'INVALID_STATE', 'Workspace is not ready for brief submission');
  }

  if (input.whiteboardPng && input.whiteboardPng.byteLength > MAX_WHITEBOARD_SIZE_BYTES) {
    throw new ApiError(400, 'INVALID_INPUT', `Whiteboard image exceeds ${MAX_WHITEBOARD_SIZE_BYTES} bytes`);
  }

  // Persist the optional whiteboard first; the brief only references it by asset id.
  if (input.whiteboardPng) {
    const newAsset = await assetStore.put({
      kind: 'whiteboard',
      fileName: 'whiteboard.png',
      mimeType: 'image/png',
      bytes: input.whiteboardPng,
    });
    const previous = workspace.whiteboardAsset;
    await workspaceStore.update((current) => ({
      ...(current ?? workspace),
      whiteboardAsset: newAsset,
      updatedAt: new Date().toISOString(),
    }));
    if (previous) await assetStore.remove(previous).catch(() => {});
  }

  const { results, notReachedConcepts } = computeResults(workspace.probeSteps, workspace.cursor);
  const summary = summarizeBrief(results, notReachedConcepts);
  const { level, factors, earlyExit } = computeConfidence(
    workspace.probeSteps,
    workspace.cursor,
  );
  const brief: TutorBrief = {
    results,
    notReachedConcepts,
    ...summary,
    confidence: level,
    confidenceFactors: factors,
    earlyExit,
    generatedAt: new Date().toISOString(),
    briefVersion: 5,
  };

  await workspaceStore.update((current) => {
    if (!current || current.createdAt !== workspace.createdAt || current.phase !== 'ready') {
      throw new ApiError(409, 'INVALID_STATE', 'The workspace changed while the brief was being generated');
    }
    return { ...current, brief, phase: 'complete', updatedAt: brief.generatedAt };
  });

  return brief;
}
