import type { TutorBrief } from '@/types/domain';
import { getStores, type createStores } from './storage';
import { getAnalysisProvider } from './ai';
import { ApiError } from './errors';
import { MAX_WHITEBOARD_SIZE_BYTES } from '@/lib/constants';
import { computeResults } from './helpers/probe-flow-helper';
import { resolveModelLabel } from './analysis-service';

type Stores = ReturnType<typeof createStores>;

export interface SubmitBriefInput {
  whiteboardPng: Buffer | null;
}

/**
 * Ends probing and generates the Tutor Brief. Answers are already stored per question, so the
 * client only sends the optional whiteboard. Allowed at any point (early submit): the probe on
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

  // Persist the optional whiteboard before invoking the model, so a failed model call can be
  // retried without losing what the student already submitted.
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
  const answeredCount = results.filter((r) => r.selectedOptionId !== null).length;
  const correctCount = results.filter((r) => r.outcome === 'correct').length;
  const dontKnowCount = results.filter((r) => r.outcome === 'dont_know').length;
  const unansweredCount = results.filter((r) => r.outcome === 'unanswered').length + notReachedConcepts.length;
  const retries = results.filter((r) => r.kind === 'easier');

  const files = [];
  for (const attachment of workspace.attachments) {
    const loaded = await assetStore.get(attachment.id);
    if (loaded) files.push({ fileName: loaded.meta.fileName, mimeType: loaded.meta.mimeType, bytes: loaded.bytes });
  }

  let modelBrief;
  try {
    modelBrief = await getAnalysisProvider().generateTutorBrief({
      grade: workspace.demoProfile.grade,
      questionText: workspace.questionText,
      files,
      analysis: workspace.analysis,
      results,
      notReachedConcepts,
      whiteboardPng: input.whiteboardPng,
    });
  } catch (err) {
    throw new ApiError(
      502,
      'AI_PROVIDER_ERROR',
      `AI brief call failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const brief: TutorBrief = {
    ...modelBrief,
    results,
    notReachedConcepts,
    answeredCount,
    correctCount,
    dontKnowCount,
    unansweredCount,
    retriesServed: retries.length,
    retriesCorrect: retries.filter((r) => r.outcome === 'correct').length,
    generatedAt: new Date().toISOString(),
    model: resolveModelLabel(),
    promptVersion: 'brief-v3',
  };

  await workspaceStore.update((current) => {
    if (!current || current.createdAt !== workspace.createdAt || current.phase !== 'ready') {
      throw new ApiError(409, 'INVALID_STATE', 'The workspace changed while the brief was being generated');
    }
    return { ...current, brief, phase: 'complete', updatedAt: brief.generatedAt };
  });

  return brief;
}
