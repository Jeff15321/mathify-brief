import { modelProbePairSchema, validateProbePair, type ModelProbePair } from '@/schemas/analysis';
import type { CurrentWorkspace, ProbeAnswer, PublicProbing } from '@/types/domain';
import { getStores, type createStores } from './storage';
import { getAnalysisProvider } from './ai';
import { ApiError } from './errors';
import { advance, currentProbe, stepToGenerate, toPublicProbing } from './helpers/probe-flow-helper';
import { toPrivateProbe } from './analysis-service';

type Stores = ReturnType<typeof createStores>;

function requireProbing(workspace: CurrentWorkspace | null): CurrentWorkspace & { analysis: NonNullable<CurrentWorkspace['analysis']> } {
  if (!workspace || !workspace.analysis) {
    throw new ApiError(404, 'NOT_FOUND', 'No analyzed workspace');
  }
  if (workspace.phase !== 'ready') {
    throw new ApiError(409, 'INVALID_STATE', 'Probing is not active for this workspace');
  }
  return workspace as CurrentWorkspace & { analysis: NonNullable<CurrentWorkspace['analysis']> };
}

function publicProbing(workspace: CurrentWorkspace): PublicProbing {
  return toPublicProbing(workspace.probeSteps, workspace.cursor, workspace.updatedAt);
}

/**
 * Generates the next missing probe pair within the buffer window (the cursor's step or the one
 * after it). Idempotent: when nothing needs generating, or another request is already generating
 * that step, it returns the current state without calling the AI. Steps are independent, so the
 * input is only the plan, parsed question and step index.
 * @throws ApiError 502 when the AI call fails; the step is marked `failed` so it can be retried.
 */
export async function generateNextProbePair(stores: Stores = getStores()): Promise<PublicProbing> {
  const { workspaceStore } = stores;
  // Set inside the locked updater when this request claims a step to generate.
  const claim: { value: { stepIndex: number; workspace: CurrentWorkspace } | null } = { value: null };

  const afterClaim = await workspaceStore.update((current) => {
    const workspace = requireProbing(current);
    const stepIndex = stepToGenerate(workspace.probeSteps, workspace.cursor, { includeFailed: true });
    if (stepIndex === null) return workspace;

    const now = new Date().toISOString();
    const next: CurrentWorkspace = {
      ...workspace,
      probeSteps: workspace.probeSteps.map((step) =>
        step.index === stepIndex ? { ...step, status: 'generating', generationStartedAt: now } : step,
      ),
      updatedAt: now,
    };
    claim.value = { stepIndex, workspace: next };
    return next;
  });

  if (!claim.value) return publicProbing(afterClaim);
  const { stepIndex, workspace } = claim.value;
  const analysis = workspace.analysis!;

  let pair: ModelProbePair | null = null;
  let failure: string | null = null;
  try {
    const raw = await getAnalysisProvider().generateProbePair({
      grade: workspace.demoProfile.grade,
      parsedQuestionMarkdown: analysis.parsedQuestionMarkdown,
      plan: analysis.probePlan,
      stepIndex,
    });
    const parsed = modelProbePairSchema.safeParse(raw);
    if (!parsed.success) {
      failure = `AI probe output failed schema validation: ${parsed.error.message}`;
    } else {
      const errors = validateProbePair(parsed.data);
      if (errors.length > 0) failure = `AI probe output failed validation: ${errors.join('; ')}`;
      else pair = parsed.data;
    }
  } catch (err) {
    failure = `AI probe generation failed: ${err instanceof Error ? err.message : String(err)}`;
  }

  const saved = await workspaceStore.update((current) => {
    // Drop the result if a new intake replaced the workspace or probing already ended.
    if (!current || current.createdAt !== workspace.createdAt || current.phase !== 'ready') {
      return current ?? workspace;
    }
    return {
      ...current,
      probeSteps: current.probeSteps.map((step) => {
        if (step.index !== stepIndex) return step;
        return pair
          ? {
              ...step,
              status: 'ready',
              generationStartedAt: null,
              main: toPrivateProbe(pair.main, stepIndex, 'main'),
              easier: toPrivateProbe(pair.easier, stepIndex, 'easier'),
            }
          : { ...step, status: 'failed', generationStartedAt: null };
      }),
      updatedAt: new Date().toISOString(),
    };
  });

  if (failure) throw new ApiError(502, 'AI_PROVIDER_ERROR', failure);
  return publicProbing(saved);
}

/**
 * Records the student's answer to the probe currently on screen and moves to the next one.
 * Only the current probe can be answered, so earlier answers are locked.
 * @throws ApiError 409 when `probeId` is not the current probe.
 */
export async function answerCurrentProbe(
  input: { probeId: string; answer: ProbeAnswer; shownAt?: string | null },
  stores: Stores = getStores(),
): Promise<PublicProbing> {
  const saved = await stores.workspaceStore.update((current) => {
    const workspace = requireProbing(current);
    const probe = currentProbe(workspace.probeSteps, workspace.cursor);
    if (!probe || !workspace.cursor || probe.id !== input.probeId) {
      throw new ApiError(409, 'INVALID_STATE', `Probe ${input.probeId} is not the current question`);
    }
    const { steps, cursor } = advance(workspace.probeSteps, workspace.cursor, input.answer, input.shownAt ?? null);
    return { ...workspace, probeSteps: steps, cursor, updatedAt: new Date().toISOString() };
  });
  return publicProbing(saved);
}
