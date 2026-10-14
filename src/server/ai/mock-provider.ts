import type { ModelAnalysis } from '@/schemas/analysis';
import type { ModelBrief } from '@/schemas/brief';
import type { AnalyzeQuestionInput, GenerateTutorBriefInput, MathAnalysisProvider } from './provider';

/**
 * Deterministic, schema-valid fixture provider. Used whenever AI_MOCK_MODE=true and in all
 * automated tests, regardless of whether an ANTHROPIC_API_KEY is configured (IMPLEMENTATION_PLAN.md
 * Section 6.3: standard tests must never call the paid Anthropic API).
 */
export class MockAnalysisProvider implements MathAnalysisProvider {
  async analyzeQuestion(_input: AnalyzeQuestionInput): Promise<ModelAnalysis> {
    return {
      parsedQuestionMarkdown: 'Solve $2(x + 3) = 14$.',
      topic: 'Linear equations',
      gradeDifficulty: 'on_grade',
      breakdown: [
        {
          title: 'Distributive property',
          description: 'Expand brackets carefully before combining like terms.',
        },
        {
          title: 'Equation balance',
          description: 'Apply the same inverse operation to both sides of the equation.',
        },
        {
          title: 'Isolating a variable',
          description: 'Simplify step by step until the variable stands alone.',
        },
      ],
      probingQuestions: [
        {
          concept: 'Distributive property',
          questionMarkdown: 'What is $2(x + 3)$ expanded?',
          options: [
            { id: 'A', textMarkdown: '$2x + 3$' },
            { id: 'B', textMarkdown: '$2x + 6$' },
            { id: 'C', textMarkdown: '$x + 6$' },
            { id: 'D', textMarkdown: '$2x + 5$' },
          ],
          correctOptionId: 'B',
          explanation: 'Distribute the 2 across both terms inside the brackets: 2*x and 2*3.',
        },
        {
          concept: 'Inverse operations',
          questionMarkdown: 'To isolate $2x$ in $2x + 6 = 14$, what should you do first?',
          options: [
            { id: 'A', textMarkdown: 'Divide both sides by 2' },
            { id: 'B', textMarkdown: 'Multiply both sides by 2' },
            { id: 'C', textMarkdown: 'Subtract 6 from both sides' },
            { id: 'D', textMarkdown: 'Add 6 to both sides' },
          ],
          correctOptionId: 'C',
          explanation: 'Subtracting 6 undoes the addition, isolating the term with x.',
        },
        {
          concept: 'Solving for x',
          questionMarkdown: 'Given $2x = 8$, what is $x$?',
          options: [
            { id: 'A', textMarkdown: '$x = 2$' },
            { id: 'B', textMarkdown: '$x = 4$' },
            { id: 'C', textMarkdown: '$x = 6$' },
            { id: 'D', textMarkdown: '$x = 16$' },
          ],
          correctOptionId: 'B',
          explanation: 'Dividing both sides by 2 gives x = 4.',
        },
      ],
    };
  }

  async generateTutorBrief(input: GenerateTutorBriefInput): Promise<ModelBrief> {
    const answeredResults = input.results.filter((r) => r.selectedOptionId !== null);
    const correctResults = answeredResults.filter((r) => r.isCorrect);

    return {
      summary: `Student attempted ${answeredResults.length} of ${input.results.length} prerequisite checks, getting ${correctResults.length} correct.`,
      gradeAssessment: 'Responses are broadly consistent with on-grade Grade 9 expectations.',
      strengths: correctResults.map((r) => ({
        observation: `Correctly answered the "${r.concept}" check.`,
        evidence: `Probe ${r.probeId}: selected ${r.selectedOptionId}.`,
      })),
      possibleGaps: answeredResults
        .filter((r) => !r.isCorrect)
        .map((r) => ({
          observation: `May need review of "${r.concept}".`,
          evidence: `Probe ${r.probeId}: selected ${r.selectedOptionId}, correct answer was ${r.correctOptionId}.`,
        })),
      whiteboardObservations: input.whiteboardPng ? ['Work shown is legible and follows the expected solution steps.'] : [],
      suggestedStartingPoint: 'Review the distributive property before moving to multi-step equations.',
      limitations: answeredResults.length < input.results.length ? ['Not enough evidence for unanswered probes.'] : [],
    };
  }
}
