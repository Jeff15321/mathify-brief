import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { ModelAnalysis } from '@/schemas/analysis';
import { modelAnalysisSchema, validateAnalysisStructure } from '@/schemas/analysis';
import { ANALYSIS_SYSTEM_PROMPT } from './prompts';
import { filesToContentBlocks } from './format-inputs';
import type { AnalyzeQuestionInput, MathAnalysisProvider } from './provider';

const ANALYSIS_MAX_TOKENS = 8192;

export class AnthropicAnalysisProvider implements MathAnalysisProvider {
  private client: Anthropic;
  private model: string;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
  }

  async analyzeQuestion(input: AnalyzeQuestionInput): Promise<ModelAnalysis> {
    const contentBlocks = filesToContentBlocks(input.files);
    const textSummary = input.questionText.trim().length > 0 ? input.questionText.trim() : null;

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: ANALYSIS_MAX_TOKENS,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Grade: ${input.grade}.${textSummary ? ` Typed question: ${textSummary}` : ' No typed question was provided; use the attached files.'}`,
            },
            ...contentBlocks,
          ],
        },
      ],
      output_config: {
        format: zodOutputFormat(modelAnalysisSchema),
      },
    });

    if (message.stop_reason === 'refusal') {
      throw new Error('Model refused to generate an analysis for this input');
    }

    const textBlock = message.content.find((block) => block.type === 'text');
    if (!textBlock || message.stop_reason === 'max_tokens') {
      throw new Error('Model response was missing or truncated');
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(textBlock.text);
    } catch {
      throw new Error('Model did not return valid JSON');
    }

    const parsed = modelAnalysisSchema.parse(parsedJson);
    const structuralErrors = validateAnalysisStructure(parsed);
    if (structuralErrors.length > 0) {
      throw new Error(`Model output failed structural validation: ${structuralErrors.join('; ')}`);
    }

    return parsed;
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
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

  const response = await client.messages.create({
    model,
    max_tokens: 16,
    messages: [{ role: 'user', content: 'Reply with exactly the word: pong' }],
  });

  const text = response.content.find((block) => block.type === 'text')?.text ?? '';
  return { ok: text.trim().length > 0, message: 'live call completed' };
}
