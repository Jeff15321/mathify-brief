import { expect, it } from 'vitest';
import { modelProbeSchema, validateProbe } from '@/schemas/analysis';
import { MockAnalysisProvider } from '@/server/ai/mock-provider';
import { setupWorkspace } from './helpers';
import { submitBrief } from '@/server/brief-service';
import { answerCurrentProbe } from '@/server/probe-service';
it('rejects a fifth repeated option and duplicate normalized option text', async () => {
  const pair = (await new MockAnalysisProvider().analyzeQuestion({ grade: 9, questionText: '', files: [] })).firstPair;
  expect(modelProbeSchema.safeParse({ ...pair.main, options: [...pair.main.options, pair.main.options[0]] }).success).toBe(false);
  const duplicate = structuredClone(pair.main); duplicate.options[1].textMarkdown = ` ${duplicate.options[0].textMarkdown.toUpperCase()} `;
  expect(validateProbe(duplicate, 'test')).toContain('test options must have distinct content');
});
it('records hint access with Next and Finish, even when Finish has no answer', async () => {
  const { stores, cleanup } = await setupWorkspace('hints');
  try {
    await answerCurrentProbe({ probeId: 's1-main', answer: 'A', hintOpened: true }, stores);
    const brief = await submitBrief({ whiteboardPng: null, pending: { probeId: 's1-easier', answer: null, hintOpened: true } }, stores);
    expect(brief.results.map(r => [r.outcome, r.hintOpened])).toEqual([['incorrect', true], ['unanswered', true]]);
    expect(brief.retries.attempted).toBe(0);
  } finally { await cleanup(); }
});
