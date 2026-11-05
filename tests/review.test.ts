import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { analysisReviewSchema, probeReviewSchema } from '@/schemas/review';
import { MockAnalysisProvider } from '@/server/ai/mock-provider';
import { analyzeCurrentWorkspace } from '@/server/analysis-service';
import { answerCurrentProbe, generateNextProbePair } from '@/server/probe-service';
import { getPublicWorkspace } from '@/server/workspace-service';
import { STALE_GENERATION_MS } from '@/server/helpers/probe-flow-helper';
import { setupWorkspace, type Stores } from './helpers';

const approved = analysisReviewSchema.parse(Object.fromEntries(
  Object.keys(analysisReviewSchema.shape).map((key) => [key, true]),
));

describe('Independent quality review gate', () => {
  let stores: Stores;
  let cleanup: () => Promise<void>;
  beforeEach(async () => {
    ({ stores, cleanup } = await setupWorkspace('review', { analyze: false }));
  });
  afterEach(async () => { vi.restoreAllMocks(); await cleanup(); });

  it.each(Object.keys(analysisReviewSchema.shape))('rejects initial content when %s fails, then permits retry', async (facet) => {
    const review = vi.spyOn(MockAnalysisProvider.prototype, 'reviewAnalysis')
      .mockResolvedValueOnce({ ...approved, [facet]: false });
    await expect(analyzeCurrentWorkspace(stores)).rejects.toThrow('Please retry analysis');
    expect(review).toHaveBeenCalledTimes(1);
    expect(await stores.workspaceStore.read()).toMatchObject({ phase: 'intake', analysis: null, probeSteps: [] });
    await expect(answerCurrentProbe({ probeId: 's1-main', answer: 'A' }, stores)).rejects.toThrow();
    await analyzeCurrentWorkspace(stores);
    expect((await stores.workspaceStore.read())?.phase).toBe('ready');
  });

  it('rejects mathematically corrupted but structurally valid generated content', async () => {
    const provider = new MockAnalysisProvider();
    const candidate = await provider.analyzeQuestion({ grade: 9, questionText: '', files: [] });
    candidate.firstPair.main.correctOptionId = 'A';
    vi.spyOn(MockAnalysisProvider.prototype, 'analyzeQuestion').mockResolvedValue(candidate);
    await expect(analyzeCurrentWorkspace(stores)).rejects.toThrow('quality review');
    expect((await stores.workspaceStore.read())?.analysis).toBeNull();
  });

  it.each(Object.keys(probeReviewSchema.shape))('rejects deferred content when %s fails without scoring it', async (facet) => {
    await analyzeCurrentWorkspace(stores);
    await answerCurrentProbe({ probeId: 's1-main', answer: 'B' }, stores);
    vi.spyOn(MockAnalysisProvider.prototype, 'reviewProbePair').mockResolvedValueOnce({ ...approved, [facet]: false });
    await expect(generateNextProbePair(stores)).rejects.toThrow('Please retry generation');
    const workspace = (await stores.workspaceStore.read())!;
    expect(workspace.probeSteps[1]).toMatchObject({ status: 'failed', main: null, easier: null, mainAnswer: null });
    expect((await getPublicWorkspace(stores))?.probing?.current).toBeNull();
    await expect(answerCurrentProbe({ probeId: 's2-main', answer: 'C' }, stores)).rejects.toThrow();
    await generateNextProbePair(stores);
    expect((await stores.workspaceStore.read())?.probeSteps[1].status).toBe('ready');
  });

  it('fails closed on malformed verdicts and hides reviewer errors', async () => {
    vi.spyOn(MockAnalysisProvider.prototype, 'reviewAnalysis')
      .mockResolvedValueOnce({} as typeof approved)
      .mockRejectedValueOnce(new Error('private reviewer: correctOptionId B; hidden explanation'));
    for (let attempt = 0; attempt < 2; attempt++) {
      await expect(analyzeCurrentWorkspace(stores)).rejects.toThrow(
        'The generated content could not pass quality review. Please retry analysis.',
      );
    }
    expect((await stores.workspaceStore.read())?.analysis).toBeNull();
  });

  it('keeps a pair unavailable while review is pending and omits verdicts from the public response', async () => {
    await analyzeCurrentWorkspace(stores);
    await answerCurrentProbe({ probeId: 's1-main', answer: 'B' }, stores);
    let release!: (value: typeof approved) => void;
    let entered!: () => void;
    const reviewing = new Promise<void>((resolve) => { entered = resolve; });
    vi.spyOn(MockAnalysisProvider.prototype, 'reviewProbePair').mockImplementationOnce(() => {
      entered();
      return new Promise((resolve) => { release = resolve; });
    });
    const pending = generateNextProbePair(stores);
    await reviewing;
    expect((await stores.workspaceStore.read())?.probeSteps[1].status).toBe('generating');
    await expect(answerCurrentProbe({ probeId: 's2-main', answer: 'C' }, stores)).rejects.toThrow();
    release(approved);
    const publicResult = JSON.stringify(await pending);
    for (const privateField of ['answerKeysCorrect', 'correctOptionId', 'explanation', 'breakdownPedagogicallySound']) {
      expect(publicResult).not.toContain(privateField);
    }
  });

  it('does not overwrite a newer failed claim with an older approved review', async () => {
    await analyzeCurrentWorkspace(stores);
    let release!: (value: typeof approved) => void;
    let entered!: () => void;
    const reviewing = new Promise<void>((resolve) => { entered = resolve; });
    vi.spyOn(MockAnalysisProvider.prototype, 'reviewProbePair')
      .mockImplementationOnce(() => { entered(); return new Promise((resolve) => { release = resolve; }); })
      .mockResolvedValueOnce({ ...approved, answerKeysCorrect: false });
    const older = generateNextProbePair(stores);
    await reviewing;
    // Simulate expiration of the first request without real-time sleeps.
    await stores.workspaceStore.update((current) => ({ ...current!, probeSteps: current!.probeSteps.map((step) =>
      step.index === 1 ? { ...step, generationStartedAt: new Date(Date.now() - STALE_GENERATION_MS - 1).toISOString() } : step,
    ) }));
    await expect(generateNextProbePair(stores)).rejects.toThrow('quality review');
    release(approved);
    await older;
    expect((await stores.workspaceStore.read())?.probeSteps[1]).toMatchObject({ status: 'failed', main: null });
  });
});
