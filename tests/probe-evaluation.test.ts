import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ModelProbePair } from '@/schemas/analysis';

const originalArgs = process.argv;
let outputDir: string;
beforeEach(async () => {
  vi.resetModules();
  outputDir = await mkdtemp(path.join(tmpdir(), 'mathify-probe-evaluation-'));
  process.argv = ['node', 'scripts/evaluate-probes.ts', '--limit', '1', '--runs', '1', '--out', path.join(outputDir, 'results.jsonl')];
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(async () => {
  process.argv = originalArgs;
  vi.restoreAllMocks();
  await rm(outputDir, { recursive: true, force: true });
});

it.each([0, 1])('retains generated step %i when its review request fails', async stepIndex => {
  const { MockAnalysisProvider } = await import('@/server/ai/mock-provider');
  const method = stepIndex === 0 ? 'reviewAnalysis' : 'reviewProbePair';
  vi.spyOn(MockAnalysisProvider.prototype, method).mockRejectedValueOnce(new Error('Review timed out'));
  await import('../scripts/evaluate-probes');
  let result!: { failure: string; pairs: { stepIndex: number; pair: ModelProbePair; verdict: unknown }[]; callsSoFar: number };
  await vi.waitFor(async () => {
    result = JSON.parse(await readFile(path.join(outputDir, 'results.jsonl'), 'utf8'));
  });
  expect(result.failure).toBe('Review timed out');
  expect(result.callsSoFar).toBe(0);
  expect(result.pairs).toHaveLength(stepIndex + 1);
  expect(result.pairs[stepIndex]).toMatchObject({ stepIndex, verdict: null });
  expect(result.pairs[stepIndex].pair.main.questionMarkdown).toBe(stepIndex === 0
    ? 'What is $2(x + 3)$ expanded?' : 'To isolate $2x$ in $2x + 6 = 14$, what should you do first?');
});

it.each([0, 1])('retains a rejected step %i and stops generation at the quality gate', async stepIndex => {
  const { MockAnalysisProvider } = await import('@/server/ai/mock-provider');
  if (stepIndex === 0) {
    const review = MockAnalysisProvider.prototype.reviewAnalysis;
    vi.spyOn(MockAnalysisProvider.prototype, 'reviewAnalysis').mockImplementationOnce(async function(this: InstanceType<typeof MockAnalysisProvider>, input, candidate) {
      return { ...await review.call(this, input, candidate), answerKeysCorrect: false };
    });
  } else {
    const review = MockAnalysisProvider.prototype.reviewProbePair;
    vi.spyOn(MockAnalysisProvider.prototype, 'reviewProbePair').mockImplementationOnce(async function(this: InstanceType<typeof MockAnalysisProvider>, input, candidate) {
      return { ...await review.call(this, input, candidate), answerKeysCorrect: false };
    });
  }
  await import('../scripts/evaluate-probes');
  let result!: { failure: string; pairs: { stepIndex: number; verdict: unknown }[] };
  await vi.waitFor(async () => {
    result = JSON.parse(await readFile(path.join(outputDir, 'results.jsonl'), 'utf8'));
  });
  expect(result.failure).toBe(stepIndex === 0 ? 'Initial quality gate rejected content' : 'Deferred quality gate rejected content');
  expect(result.pairs).toHaveLength(stepIndex + 1);
  expect(result.pairs[stepIndex]).toMatchObject({ stepIndex, verdict: { answerKeysCorrect: false } });
});
