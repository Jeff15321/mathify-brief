import { modelAnalysisSchema, validateAnalysisStructure } from '@/schemas/analysis';
import type { QuestionAnalysisPublic, QuestionAnalysisStored } from '@/types/domain';
import { toPublicAnalysis } from '@/types/domain';
import { getStores, type createStores } from './storage';
import { getAnalysisProvider } from './ai';
import { ApiError } from './errors';

type Stores = ReturnType<typeof createStores>;

function resolveModelLabel(): string {
  if (process.env.AI_MOCK_MODE !== 'false') return 'mock-provider';
  return process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
}

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
    probingQuestions: parsed.data.probingQuestions.map((probe, index) => ({
      id: `q${index + 1}`,
      ...probe,
    })),
    generatedAt: now,
    model: resolveModelLabel(),
    promptVersion: 'analysis-v1',
    analysisVersion: 1,
  };

  await workspaceStore.write({
    ...workspace,
    analysis: stored,
    phase: 'ready',
    updatedAt: now,
  });

  return toPublicAnalysis(stored);
}
