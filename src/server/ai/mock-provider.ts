import type { ModelAnalysis, ModelProbePair } from '@/schemas/analysis';
import type { ModelBrief } from '@/schemas/brief';
import type {
  AnalyzeQuestionInput,
  GenerateProbePairInput,
  GenerateTutorBriefInput,
  MathAnalysisProvider,
} from './provider';

const MOCK_PLAN: ModelAnalysis['probePlan'] = [
  { concept: 'Distributive property', intent: 'Check that the student multiplies every term inside the brackets.' },
  { concept: 'Inverse operations', intent: 'Check that the student undoes addition before division.' },
  { concept: 'Solving for x', intent: 'Check that the student divides to isolate the variable.' },
];

/** Fixture pairs per plan step. Main keys: B, C, B. Easier keys: B, B, B. */
const MOCK_PAIRS: ModelProbePair[] = [
  {
    main: {
      concept: 'Distributive property',
      questionMarkdown: 'What is $2(x + 3)$ expanded?',
      options: [
        { id: 'A', textMarkdown: '$2x + 3$' },
        { id: 'B', textMarkdown: '$2x + 6$' },
        { id: 'C', textMarkdown: '$x + 6$' },
        { id: 'D', textMarkdown: '$2x + 5$' },
      ],
      correctOptionId: 'B',
      explanation: 'Distribute the 2 across both terms inside the brackets: $2 \\cdot x$ and $2 \\cdot 3$.',
    },
    easier: {
      concept: 'Distributive property',
      questionMarkdown: 'Which expression equals $2(x + 1)$?',
      options: [
        { id: 'A', textMarkdown: '$2x + 1$' },
        { id: 'B', textMarkdown: '$2x + 2$' },
        { id: 'C', textMarkdown: '$x + 2$' },
        { id: 'D', textMarkdown: '$2x$' },
      ],
      correctOptionId: 'B',
      explanation: 'The 2 multiplies both $x$ and $1$.',
    },
  },
  {
    main: {
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
    easier: {
      concept: 'Inverse operations',
      questionMarkdown: 'To get $x$ alone in $x + 6 = 10$, what do you do to both sides?',
      options: [
        { id: 'A', textMarkdown: 'Add 6' },
        { id: 'B', textMarkdown: 'Subtract 6' },
        { id: 'C', textMarkdown: 'Multiply by 6' },
        { id: 'D', textMarkdown: 'Divide by 6' },
      ],
      correctOptionId: 'B',
      explanation: 'Subtracting 6 undoes adding 6.',
    },
  },
  {
    main: {
      concept: 'Solving for x',
      questionMarkdown: 'Given $2x = 8$, what is $x$?',
      options: [
        { id: 'A', textMarkdown: '$x = 2$' },
        { id: 'B', textMarkdown: '$x = 4$' },
        { id: 'C', textMarkdown: '$x = 6$' },
        { id: 'D', textMarkdown: '$x = 16$' },
      ],
      correctOptionId: 'B',
      explanation: 'Dividing both sides by 2 gives $x = 4$.',
    },
    easier: {
      concept: 'Solving for x',
      questionMarkdown: 'If $2x = 4$, what is $x$?',
      options: [
        { id: 'A', textMarkdown: '$x = 1$' },
        { id: 'B', textMarkdown: '$x = 2$' },
        { id: 'C', textMarkdown: '$x = 4$' },
        { id: 'D', textMarkdown: '$x = 8$' },
      ],
      correctOptionId: 'B',
      explanation: 'Dividing both sides by 2 gives $x = 2$.',
    },
  },
];

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
      estimatedQuestionGrade: 'Grade 9',
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
      probePlan: MOCK_PLAN,
      firstPair: MOCK_PAIRS[0],
    };
  }

  async generateProbePair(input: GenerateProbePairInput): Promise<ModelProbePair> {
    const pair = MOCK_PAIRS[input.stepIndex];
    if (!pair) throw new Error(`Mock provider has no probe pair for step ${input.stepIndex}`);
    return pair;
  }

  async generateTutorBrief(input: GenerateTutorBriefInput): Promise<ModelBrief> {
    const correctResults = input.results.filter((r) => r.outcome === 'correct');
    const incorrectResults = input.results.filter((r) => r.outcome === 'incorrect');
    const dontKnowResults = input.results.filter((r) => r.outcome === 'dont_know');
    const attemptedCount = correctResults.length + incorrectResults.length;
    const hasMissingEvidence =
      input.notReachedConcepts.length > 0 || input.results.some((r) => r.outcome === 'unanswered');

    return {
      summary: `Student attempted ${attemptedCount} of ${input.results.length} prerequisite checks, getting ${correctResults.length} correct.`,
      gradeAssessment: 'Responses are broadly consistent with on-grade Grade 9 expectations.',
      strengths: correctResults.map((r) => ({
        observation: `Correctly answered the "${r.concept}" check.`,
        evidence: `Probe ${r.probeId}: selected ${r.selectedOptionId}.`,
      })),
      possibleGaps: [
        ...incorrectResults.map((r) => ({
          observation: `May need review of "${r.concept}".`,
          evidence: `Probe ${r.probeId}: selected ${r.selectedOptionId}, correct answer was ${r.correctOptionId}.`,
        })),
        ...dontKnowResults.map((r) => ({
          observation: `Reported being unsure about "${r.concept}".`,
          evidence: `Probe ${r.probeId}: selected "I don't know".`,
        })),
      ],
      whiteboardObservations: input.whiteboardPng ? ['Work shown is legible and follows the expected solution steps.'] : [],
      suggestedStartingPoint: 'Review the distributive property before moving to multi-step equations.',
      limitations: hasMissingEvidence ? ['Not enough evidence for unanswered or unreached probes.'] : [],
    };
  }
}
