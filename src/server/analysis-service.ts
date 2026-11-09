import { ANALYSIS_PROMPT_VERSION } from './ai/prompts';
import { randomUUID } from 'node:crypto';
import { assertWorkspaceId } from './workspace-identity';
import type { CurrentWorkspace } from '@/types/domain';
import { modelAnalysisSchema, validateAnalysisStructure, type ModelProbe } from '@/schemas/analysis';
import type { PrivateProbe, ProbeKind, ProbeStep, QuestionAnalysisPublic, QuestionAnalysisStored } from '@/types/domain';
import { toPublicAnalysis } from '@/types/domain';
import { getStores, type createStores } from './storage';
import { getAnalysisProvider } from './ai';
import { analysisReviewSchema, reviewApproved } from '@/schemas/review';
import { ApiError } from './errors';
import { probeIdFor } from './helpers/probe-flow-helper';

type Stores = ReturnType<typeof createStores>;

/** Model label stored with generated artifacts for provenance. */
function resolveModelLabel(): string {
  if (process.env.AI_MOCK_MODE !== 'false') return 'mock-provider';
  return process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
}

/** Gives a generated probe its stable server-side id (e.g. "s1-main"). */
export function toPrivateProbe(probe: ModelProbe, stepIndex: number, kind: ProbeKind): PrivateProbe {
  return { id: probeIdFor(stepIndex, kind), ...probe };
}

/**
 * Runs Stage A once: parses the question, plans the probe steps and generates the first step's
 * main + easier probes. Later steps start as `pending` and are generated on demand.
 * @returns The public analysis (no probes or keys).
 */
export async function analyzeCurrentWorkspace(stores: Stores = getStores(), workspaceId?: string): Promise<QuestionAnalysisPublic | null> {
  const operationId = randomUUID();
  let ownsClaim = false;
  const workspace = await stores.workspaceStore.update(current => {
    assertWorkspaceId(current, workspaceId);
    if (!current) throw new ApiError(404, 'NOT_FOUND', 'No current workspace to analyze');
    if (current.phase !== 'intake' || current.analysis) throw new ApiError(409, 'INVALID_STATE', 'Workspace has already been analyzed');
    const operation = current.analysisOperation;
    if (operation?.status === 'generating' && Date.now() - Date.parse(operation.startedAt) < 120_000) return current;
    ownsClaim = true;
    return { ...current, analysisOperation: { id: operationId, startedAt: new Date().toISOString(), status: 'generating' } };
  });
  if (!ownsClaim) return null; // The browser observes the existing operation via GET.
  try {
    return await runAnalysis(workspace, stores, operationId);
  } catch (error) {
    await stores.workspaceStore.update(current => {
      if (!current) throw error;
      if (current.workspaceId !== workspace.workspaceId || current.analysisOperation?.id !== operationId) return current;
      return { ...current, analysisOperation: { ...current.analysisOperation, status: 'failed' } };
    }).catch(() => {});
    throw error;
  }
}

async function runAnalysis(workspace: CurrentWorkspace, stores: Stores, operationId: string): Promise<QuestionAnalysisPublic> {
  const started = performance.now();
  const { workspaceStore, assetStore } = stores;
  const files = [];
  for (const attachment of workspace.attachments) {
    const loaded = await assetStore.get(attachment.id);
    if (!loaded) {
      throw new ApiError(500, 'INTERNAL_ERROR', `Attachment ${attachment.id} is missing from storage`);
    }
    files.push({ fileName: loaded.meta.fileName, mimeType: loaded.meta.mimeType, bytes: loaded.bytes });
  }

  const provider = getAnalysisProvider();

  let rawResult;
  try {
    rawResult = await provider.analyzeQuestion({
      grade: workspace.demoProfile.grade,
      questionText: workspace.questionText,
      files,
    });
  } catch {
    throw new ApiError(
      502,
      'AI_PROVIDER_ERROR',
      'AI analysis could not be completed. Please retry analysis.',
    );
  }

  const parsed = modelAnalysisSchema.safeParse(rawResult);
  if (!parsed.success) {
    throw new ApiError(502, 'AI_PROVIDER_ERROR', 'AI analysis could not be validated. Please retry analysis.');
  }

  const structuralErrors = validateAnalysisStructure(parsed.data);
  if (structuralErrors.length > 0) {
    throw new ApiError(502, 'AI_PROVIDER_ERROR', 'AI analysis could not be validated. Please retry analysis.');
  }

  try {
    const verdict = analysisReviewSchema.parse(await provider.reviewAnalysis({
      grade: workspace.demoProfile.grade, questionText: workspace.questionText, files,
    }, parsed.data));
    if (!reviewApproved(verdict)) throw new Error('Review rejected');
  } catch {
    throw new ApiError(502, 'AI_PROVIDER_ERROR', 'The generated content could not pass quality review. Please retry analysis.');
  }

  const now = new Date().toISOString();
  const stored: QuestionAnalysisStored = {
    preparationDurationMs: performance.now() - started,
    parsedQuestionMarkdown: parsed.data.parsedQuestionMarkdown,
    topic: parsed.data.topic,
    estimatedQuestionGrade: parsed.data.estimatedQuestionGrade,
    gradeDifficulty: parsed.data.gradeDifficulty,
    breakdown: parsed.data.breakdown,
    probePlan: parsed.data.probePlan,
    generatedAt: now,
    model: resolveModelLabel(),
    promptVersion: ANALYSIS_PROMPT_VERSION,
    analysisVersion: 1,
  };

  const probeSteps: ProbeStep[] = parsed.data.probePlan.map((item, index) => ({
    index,
    concept: item.concept,
    promptVersion: index === 0 ? ANALYSIS_PROMPT_VERSION : undefined,
    status: index === 0 ? 'ready' : 'pending',
    generationStartedAt: null,
    main: index === 0 ? toPrivateProbe(parsed.data.firstPair.main, 0, 'main') : null,
    easier: index === 0 ? toPrivateProbe(parsed.data.firstPair.easier, 0, 'easier') : null,
    mainAnswer: null,
    easierAnswer: null,
    easierServed: false,
    mainHintOpened: false, easierHintOpened: false,
  }));

  await workspaceStore.update((current) => {
    if (!current || current.workspaceId !== workspace.workspaceId || current.analysis !== null || current.analysisOperation?.id !== operationId) {
      throw new ApiError(409, 'INVALID_STATE', 'The workspace changed while it was being analyzed');
    }
    return {
      ...current,
      analysis: stored,
      analysisOperation: null,
      probeSteps,
      cursor: { stepIndex: 0, kind: 'main' },
      phase: 'ready',
      updatedAt: now,
    };
  });

  return toPublicAnalysis(stored);
}
