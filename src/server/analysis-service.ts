import { modelAnalysisSchema, validateAnalysisStructure, type ModelProbe } from '@/schemas/analysis';
import type { PrivateProbe, ProbeKind, ProbeStep, QuestionAnalysisPublic, QuestionAnalysisStored } from '@/types/domain';
import { toPublicAnalysis } from '@/types/domain';
import { getStores, type createStores } from './storage';
import { getAnalysisProvider } from './ai';
import { ApiError } from './errors';
import { probeIdFor } from './helpers/probe-flow-helper';

type Stores = ReturnType<typeof createStores>;

/** Model label stored with generated artifacts for provenance. */
export function resolveModelLabel(): string {
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
export async function analyzeCurrentWorkspace(stores: Stores = getStores()): Promise<QuestionAnalysisPublic> {
  const { workspaceStore, assetStore } = stores;
  const workspace = await workspaceStore.read();

  if (!workspace) {
    throw new ApiError(404, 'NOT_FOUND', 'No current workspace to analyze');
  }
  if (workspace.phase !== 'intake' || workspace.analysis !== null) {
    throw new ApiError(409, 'INVALID_STATE', 'Workspace has already been analyzed');
  }

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
  } catch (err) {
    throw new ApiError(
      502,
      'AI_PROVIDER_ERROR',
      `AI analysis call failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const parsed = modelAnalysisSchema.safeParse(rawResult);
  if (!parsed.success) {
    throw new ApiError(502, 'AI_PROVIDER_ERROR', `AI analysis output failed schema validation: ${parsed.error.message}`);
  }

  const structuralErrors = validateAnalysisStructure(parsed.data);
  if (structuralErrors.length > 0) {
    throw new ApiError(502, 'AI_PROVIDER_ERROR', `AI analysis output failed validation: ${structuralErrors.join('; ')}`);
  }

  const now = new Date().toISOString();
  const stored: QuestionAnalysisStored = {
    parsedQuestionMarkdown: parsed.data.parsedQuestionMarkdown,
    topic: parsed.data.topic,
    estimatedQuestionGrade: parsed.data.estimatedQuestionGrade,
    gradeDifficulty: parsed.data.gradeDifficulty,
    breakdown: parsed.data.breakdown,
    probePlan: parsed.data.probePlan,
    generatedAt: now,
    model: resolveModelLabel(),
    promptVersion: 'analysis-v2',
    analysisVersion: 1,
  };

  const probeSteps: ProbeStep[] = parsed.data.probePlan.map((item, index) => ({
    index,
    concept: item.concept,
    status: index === 0 ? 'ready' : 'pending',
    generationStartedAt: null,
    main: index === 0 ? toPrivateProbe(parsed.data.firstPair.main, 0, 'main') : null,
    easier: index === 0 ? toPrivateProbe(parsed.data.firstPair.easier, 0, 'easier') : null,
    mainAnswer: null,
    easierAnswer: null,
    easierServed: false,
  }));

  await workspaceStore.update((current) => {
    if (!current || current.createdAt !== workspace.createdAt || current.analysis !== null) {
      throw new ApiError(409, 'INVALID_STATE', 'The workspace changed while it was being analyzed');
    }
    return {
      ...current,
      analysis: stored,
      probeSteps,
      cursor: { stepIndex: 0, kind: 'main' },
      phase: 'ready',
      updatedAt: now,
    };
  });

  return toPublicAnalysis(stored);
}
