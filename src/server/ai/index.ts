import type { MathAnalysisProvider } from './provider';
import { MockAnalysisProvider } from './mock-provider';
import { AnthropicAnalysisProvider } from './anthropic-provider';

/**
 * Single construction point for the AI provider (IMPLEMENTATION_PLAN.md Section 6.3).
 * AI_MOCK_MODE=true guarantees zero Anthropic requests.
 */
export function getAnalysisProvider(): MathAnalysisProvider {
  if (process.env.AI_MOCK_MODE !== 'false') {
    return new MockAnalysisProvider();
  }
  return new AnthropicAnalysisProvider();
}
