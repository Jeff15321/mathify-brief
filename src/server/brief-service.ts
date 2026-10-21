import type { PrivateProbe, ProbeAnswers, ProbeOutcome, ProbeResult, TutorBrief } from '@/types/domain';
import { getStores, type createStores } from './storage';
import { getAnalysisProvider } from './ai';
import { ApiError } from './errors';
import { MAX_WHITEBOARD_SIZE_BYTES } from '@/lib/constants';

type Stores = ReturnType<typeof createStores>;

export interface SubmitBriefInput {
  answers: ProbeAnswers;
  whiteboardPng: Buffer | null;
}

/**
 * Joins stored answer keys with submitted answers into per-probe results.
 * "I don't know" is scored as its own outcome: no selected option and isCorrect null, like unanswered.
 */
function computeResults(probingQuestions: PrivateProbe[], answers: ProbeAnswers): ProbeResult[] {
  return probingQuestions.map((probe) => {
    const answer = answers[probe.id] ?? null;
    const selectedOptionId = answer && answer !== 'IDK' ? answer : null;
    const selectedOption = selectedOptionId ? probe.options.find((o) => o.id === selectedOptionId) : undefined;
    const correctOption = probe.options.find((o) => o.id === probe.correctOptionId)!;
    const isCorrect = selectedOptionId ? selectedOptionId === probe.correctOptionId : null;
    let outcome: ProbeOutcome = 'unanswered';
    if (answer === 'IDK') outcome = 'dont_know';
    else if (isCorrect !== null) outcome = isCorrect ? 'correct' : 'incorrect';

    return {
      probeId: probe.id,
      concept: probe.concept,
      questionMarkdown: probe.questionMarkdown,
      selectedOptionId,
      selectedOptionText: selectedOption?.textMarkdown ?? null,
      correctOptionId: probe.correctOptionId,
      correctOptionText: correctOption.textMarkdown,
      isCorrect,
      outcome,
      explanation: probe.explanation,
    };
  });
}

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

  const validProbeIds = new Set(workspace.analysis.probingQuestions.map((p) => p.id));
  for (const probeId of Object.keys(input.answers)) {
    if (!validProbeIds.has(probeId)) {
      throw new ApiError(400, 'INVALID_INPUT', `Unknown probe id: ${probeId}`);
    }
  }

  if (input.whiteboardPng && input.whiteboardPng.byteLength > MAX_WHITEBOARD_SIZE_BYTES) {
    throw new ApiError(400, 'INVALID_INPUT', `Whiteboard image exceeds ${MAX_WHITEBOARD_SIZE_BYTES} bytes`);
  }

  // Persist submitted answers (and optional whiteboard) before invoking the model, so a failed
  // model call can be retried without losing what the student already submitted.
  let whiteboardAsset = workspace.whiteboardAsset;
  if (input.whiteboardPng) {
    const previousAsset = workspace.whiteboardAsset;
    whiteboardAsset = await assetStore.put({
      kind: 'whiteboard',
      fileName: 'whiteboard.png',
      mimeType: 'image/png',
      bytes: input.whiteboardPng,
    });
    if (previousAsset) {
      await assetStore.remove(previousAsset).catch(() => {});
    }
  }

  const now = new Date().toISOString();
  const workspaceWithSubmission = {
    ...workspace,
    answers: input.answers,
    whiteboardAsset,
    updatedAt: now,
  };
  await workspaceStore.write(workspaceWithSubmission);

  const results = computeResults(workspace.analysis.probingQuestions, input.answers);
  const answeredCount = results.filter((r) => r.selectedOptionId !== null).length;
  const correctCount = results.filter((r) => r.outcome === 'correct').length;
  const dontKnowCount = results.filter((r) => r.outcome === 'dont_know').length;
  const unansweredCount = results.filter((r) => r.outcome === 'unanswered').length;

  const files = [];
  for (const attachment of workspace.attachments) {
    const loaded = await assetStore.get(attachment.id);
    if (loaded) files.push({ fileName: loaded.meta.fileName, mimeType: loaded.meta.mimeType, bytes: loaded.bytes });
  }

  const provider = getAnalysisProvider();

  let modelBrief;
  try {
    modelBrief = await provider.generateTutorBrief({
      grade: workspace.demoProfile.grade,
      questionText: workspace.questionText,
      files,
      analysis: workspace.analysis,
      results,
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
    answeredCount,
    correctCount,
    dontKnowCount,
    unansweredCount,
    generatedAt: new Date().toISOString(),
    model: process.env.AI_MOCK_MODE !== 'false' ? 'mock-provider' : process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
    promptVersion: 'brief-v2',
  };

  await workspaceStore.write({
    ...workspaceWithSubmission,
    brief,
    phase: 'complete',
    updatedAt: brief.generatedAt,
  });

  return brief;
}
