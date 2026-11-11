import { expect, it } from 'vitest';
import { setupWorkspace } from './helpers';
import { submitBrief } from '@/server/brief-service';
import { answerCurrentProbe, generateNextProbePair } from '@/server/probe-service';
import { evidenceSummary, suggestedStart } from '@/server/helpers/evidence-summary-helper';
it('partial success states coverage without asserting all planned checks were correct', async () => {
  const { stores, cleanup } = await setupWorkspace('partial-evidence');
  try {
    const brief = await submitBrief({ whiteboardPng: null, pending: { probeId: 's1-main', answer: 'B', hintOpened: true } }, stores);
    expect(evidenceSummary(brief)).toMatchObject({ coverage: '1 of 3 core checks answered', complete: false, notReached: 2, hintsOpened: 1 });
    expect(suggestedStart(brief).reason).toContain('coverage is incomplete');
    expect(suggestedStart(brief).title).toContain('Check');
  } finally { await cleanup(); }
});
it('keeps simpler success beside the missed main and explains the selection rule', async () => {
  const { stores, cleanup } = await setupWorkspace('retry-evidence');
  try {
    await answerCurrentProbe({ probeId: 's1-main', answer: 'A' }, stores);
    const brief = await submitBrief({ whiteboardPng: null, pending: { probeId: 's1-easier', answer: 'B' } }, stores);
    const start = suggestedStart(brief);
    expect(start.title).toContain('Build on the simpler');
    expect(start.reason).toContain('First core check');
    expect(start.retry?.outcome).toBe('correct');
    expect(start.observation?.selectedOptionId).toBe('A');
  } finally { await cleanup(); }
});
it('distinguishes no evidence from complete correct coverage', async () => {
  for (const complete of [false, true]) {
    const { stores, cleanup } = await setupWorkspace('complete-evidence');
    try {
      if (complete) for (const [index, answer] of (['B', 'C', 'B'] as const).entries()) {
        await generateNextProbePair(stores); await answerCurrentProbe({ probeId: `s${index + 1}-main`, answer }, stores);
      }
      const brief = await submitBrief({ whiteboardPng: null }, stores);
      expect(evidenceSummary(brief).complete).toBe(complete);
      expect(suggestedStart(brief).reason).toContain(complete ? 'does not establish mastery' : 'Understanding is still unknown');
    } finally { await cleanup(); }
  }
});
