import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod';
import type { ModelAnalysis, ModelProbePair } from '@/schemas/analysis';
import {
  modelAnalysisSchema,
  modelProbePairSchema,
  validateAnalysisStructure,
  validateProbePair,
} from '@/schemas/analysis';
import { ANALYSIS_SYSTEM_PROMPT, PROBE_PAIR_SYSTEM_PROMPT } from './prompts';
import { filesToContentBlocks } from './format-inputs';
import type { AnalyzeQuestionInput, GenerateProbePairInput, MathAnalysisProvider } from './provider';

const ANALYSIS_MAX_TOKENS = 8192;
const PROBE_PAIR_MAX_TOKENS = 4096;

/** The Anthropic Messages API implementation of the two Mathify model operations. */
export class AnthropicAnalysisProvider implements MathAnalysisProvider {
  private client: Anthropic;
  private model: string;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
  }

  async analyzeQuestion(input: AnalyzeQuestionInput): Promise<ModelAnalysis> {
    const textSummary = input.questionText.trim().length > 0 ? input.questionText.trim() : null;

    const parsed = await this.createStructured({
      system: ANALYSIS_SYSTEM_PROMPT,
      maxTokens: ANALYSIS_MAX_TOKENS,
      schema: modelAnalysisSchema,
      operation: 'an analysis',
      content: [
        {
          type: 'text',
          text: `Grade: ${input.grade}.${textSummary ? ` Typed question: ${textSummary}` : ' No typed question was provided; use the attached files.'}`,
        },
        ...filesToContentBlocks(input.files),
      ],
    });

    const structuralErrors = validateAnalysisStructure(parsed);
    if (structuralErrors.length > 0) {
      throw new Error(`Model output failed structural validation: ${structuralErrors.join('; ')}`);
    }
    return parsed;
  }

  async generateProbePair(input: GenerateProbePairInput): Promise<ModelProbePair> {
    const planText = input.plan
      .map((item, index) => `${index + 1}. ${item.concept}: ${item.intent}`)
      .join('\n');
    const step = input.plan[input.stepIndex];

    const parsed = await this.createStructured({
      system: PROBE_PAIR_SYSTEM_PROMPT,
      maxTokens: PROBE_PAIR_MAX_TOKENS,
      schema: modelProbePairSchema,
      operation: 'probe questions',
      content: [
        {
          type: 'text',
          text: [
            `Grade: ${input.grade}.`,
            `Parsed problem: ${input.parsedQuestionMarkdown}`,
            `Probe plan:\n${planText}`,
            `Write the main and easier probes for step ${input.stepIndex + 1} ("${step.concept}").`,
          ].join('\n'),
        },
      ],
    });

    const structuralErrors = validateProbePair(parsed);
    if (structuralErrors.length > 0) {
      throw new Error(`Model output failed structural validation: ${structuralErrors.join('; ')}`);
    }
    return parsed;
  }

  /**
   * Sends one structured-output Messages API request and parses the JSON result with `schema`.
   * @throws Error on refusal, truncation, missing text, or invalid JSON/shape.
   */
  private async createStructured<T extends z.ZodType>({
    system,
    maxTokens,
    schema,
    content,
    operation,
  }: {
    system: string;
    maxTokens: number;
    schema: T;
    content: Anthropic.ContentBlockParam[];
    operation: string;
  }): Promise<z.infer<T>> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content }],
      output_config: { format: zodOutputFormat(schema) },
    });

    if (message.stop_reason === 'refusal') {
      throw new Error(`Model refused to generate ${operation} for this input`);
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

    return schema.parse(parsedJson);
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
