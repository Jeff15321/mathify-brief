import Anthropic from '@anthropic-ai/sdk';
import type { ModelAnalysis } from '@/schemas/analysis';
import { modelAnalysisSchema, validateAnalysisStructure } from '@/schemas/analysis';
import type { AnalyzeQuestionInput, MathAnalysisProvider } from './provider';

/**
 * Only module that imports @anthropic-ai/sdk. Full Stage A prompt/schema wiring lands in Stage 2;
 * Stage 0 only needs this to exist and be importable server-side, plus support one live text
 * connectivity smoke call.
 */
export class AnthropicAnalysisProvider implements MathAnalysisProvider {
  private client: Anthropic;
  private model: string;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
  }

  async analyzeQuestion(_input: AnalyzeQuestionInput): Promise<ModelAnalysis> {
    throw new Error('AnthropicAnalysisProvider.analyzeQuestion is implemented in Stage 2');
  }
}

/**
 * Stage 0 smoke helper only: one minimal text-only live Messages API call, gated by
 * RUN_LIVE_AI_SMOKE=1 and a configured ANTHROPIC_API_KEY. Never logs the key.
 */
export async function runLiveTextSmokeTest(): Promise<{ ok: boolean; message: string }> {
  if (process.env.RUN_LIVE_AI_SMOKE !== '1' || !process.env.ANTHROPIC_API_KEY) {
    return { ok: false, message: 'skipped (key/opt-in missing)' };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

  const response = await client.messages.create({
    model,
    max_tokens: 16,
    messages: [{ role: 'user', content: 'Reply with exactly the word: pong' }],
  });

  const text = response.content.find((block) => block.type === 'text')?.text ?? '';
  return { ok: text.trim().length > 0, message: 'live call completed' };
}

export { modelAnalysisSchema, validateAnalysisStructure };
