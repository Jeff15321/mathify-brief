import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analysisReviewSchema, probeReviewSchema } from '@/schemas/review';
import { MockAnalysisProvider } from '@/server/ai/mock-provider';

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('@anthropic-ai/sdk', () => ({ default: class { messages = { create }; } }));
import { AnthropicAnalysisProvider } from '@/server/ai/anthropic-provider';

const input = { grade: 9, questionText: 'Solve 2(x + 3) = 14.', files: [] };
const verdict = Object.fromEntries(Object.keys(analysisReviewSchema.shape).map((key) => [key, true]));
const response = (text: string) => ({ stop_reason: 'end_turn', content: [{ type: 'text', text }] });

describe('Anthropic review requests (SDK mocked, no network)', () => {
  beforeEach(() => create.mockReset());

  it('uses a separate structured request with original attachments and complete candidate', async () => {
    const candidate = await new MockAnalysisProvider().analyzeQuestion(input);
    create.mockResolvedValue(response(JSON.stringify(verdict)));
    const provider = new AnthropicAnalysisProvider();
    await provider.reviewAnalysis({ ...input, files: [{ fileName: 'problem.png', mimeType: 'image/png', bytes: Buffer.from('fixture') }] }, candidate);
    const request = create.mock.calls[0][0];
    expect(request.messages).toHaveLength(1);
    expect(request.messages[0].content[1].type).toBe('image');
    expect(JSON.parse(request.messages[0].content[0].text)).toMatchObject({ originalQuestion: input.questionText, candidate });
    expect(request.system).toContain('Solve BOTH probes independently');
    expect(request.output_config.format.schema.properties).toHaveProperty('breakdownMathematicallyCorrect');
  });

  it('reviews deferred pairs with plan context and no student answers', async () => {
    const mock = new MockAnalysisProvider();
    const analysis = await mock.analyzeQuestion(input);
    const context = { grade: 9, parsedQuestionMarkdown: analysis.parsedQuestionMarkdown, plan: analysis.probePlan, stepIndex: 1 };
    const candidate = await mock.generateProbePair(context);
    create.mockResolvedValue(response(JSON.stringify(probeReviewSchema.parse(verdict))));
    await new AnthropicAnalysisProvider().reviewProbePair(context, candidate);
    const request = create.mock.calls[0][0];
    expect(JSON.parse(request.messages[0].content[0].text)).toEqual({ ...context, candidate });
    expect(request.output_config.format.schema.properties).toHaveProperty('exactlyOneCorrectOption');
  });

  it('sends the learner context to generation and review only when present', async () => {
    const learnerContext = '- Struggle (active, last seen 2026-10-03): Multiplies only the first term.';
    const mock = new MockAnalysisProvider();
    const analysis = await mock.analyzeQuestion(input);
    const pairInput = { grade: 9, parsedQuestionMarkdown: analysis.parsedQuestionMarkdown, plan: analysis.probePlan, stepIndex: 1 };
    const provider = new AnthropicAnalysisProvider();
    create.mockResolvedValue(response(JSON.stringify(analysis)));
    await provider.analyzeQuestion(input);
    await provider.analyzeQuestion({ ...input, learnerContext });
    create.mockResolvedValue(response(JSON.stringify(await mock.generateProbePair(pairInput))));
    await provider.generateProbePair(pairInput);
    await provider.generateProbePair({ ...pairInput, learnerContext });
    create.mockResolvedValue(response(JSON.stringify(verdict)));
    await provider.reviewAnalysis(input, analysis);
    await provider.reviewAnalysis({ ...input, learnerContext }, analysis);

    const texts: string[] = create.mock.calls.map(([request]) => request.messages[0].content[0].text);
    const line = `Learner context (tutor-only, from past sessions):\n${learnerContext}`;
    [texts[0], texts[2]].forEach((text) => expect(text).not.toContain('Learner context'));
    [texts[1], texts[3]].forEach((text) => expect(text).toContain(line));
    expect(JSON.parse(texts[4])).not.toHaveProperty('learnerContext');
    expect(JSON.parse(texts[5]).learnerContext).toBe(learnerContext);
  });

  it.each([
    response('{}'), response('not json'),
    { stop_reason: 'max_tokens', content: [{ type: 'text', text: JSON.stringify(verdict) }] },
    { stop_reason: 'refusal', content: [] },
  ])('does not accept malformed, truncated or refused review %#', async (result) => {
    create.mockResolvedValue(result);
    const candidate = await new MockAnalysisProvider().analyzeQuestion(input);
    await expect(new AnthropicAnalysisProvider().reviewAnalysis(input, candidate)).rejects.toThrow();
  });
});
