import { isDeepStrictEqual } from 'node:util';
import type { ModelAnalysis, ModelProbePair } from '@/schemas/analysis';
import { analysisReviewSchema, probeReviewSchema } from '@/schemas/review';
import type { ModelBrief, ModelHistory } from '@/schemas/brief';
import type { ModelSessionSummary } from '@/schemas/session';
import type { ModelLearnerProfile } from '@/schemas/profile';
import type {
  AnalyzeQuestionInput,
  BuildLearnerProfileInput,
  GenerateProbePairInput,
  GenerateTutorBriefInput,
  MathAnalysisProvider,
  RelevantHistoryInput,
  SummarizeSessionInput,
} from './provider';

/** Matches the storyline of the sample sessions in samples/sessions/. */
const MOCK_OBSERVATIONS: ModelSessionSummary['observations'] = [
  { category: 'struggle', text: 'Multiplied only the first term inside brackets.', quote: 'So it\'s 2x plus 3?' },
  { category: 'struggle', text: 'Kept the sign when moving a term across the equals sign.' },
  { category: 'strength', text: 'Solved one-step equations quickly and correctly.' },
  { category: 'what_works', text: 'Asking "What would you try first?" led to a good first move.' },
  { category: 'habit', text: 'Skips substitution checks unless asked.', quote: 'I\'m sure that\'s right.' },
];

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
      questionMarkdown: 'Given $3x = 15$, what is $x$?',
      options: [
        { id: 'A', textMarkdown: '$x = 2$' },
        { id: 'B', textMarkdown: '$x = 5$' },
        { id: 'C', textMarkdown: '$x = 6$' },
        { id: 'D', textMarkdown: '$x = 16$' },
      ],
      correctOptionId: 'B',
      explanation: 'Dividing both sides by 3 gives $x = 5$.',
    },
    easier: {
      concept: 'Solving for x',
      questionMarkdown: 'If $2x = 6$, what is $x$?',
      options: [
        { id: 'A', textMarkdown: '$x = 1$' },
        { id: 'B', textMarkdown: '$x = 3$' },
        { id: 'C', textMarkdown: '$x = 5$' },
        { id: 'D', textMarkdown: '$x = 8$' },
      ],
      correctOptionId: 'B',
      explanation: 'Dividing both sides by 2 gives $x = 3$.',
    },
  },
];

const HINTS = ['Think about what the number outside the brackets acts on.', 'Think about undoing the change to the variable term.', 'Think about equal groups.'];
MOCK_PAIRS.forEach((pair, index) => { pair.main.hint = HINTS[index]; pair.easier.hint = HINTS[index]; });

const MOCK_ANALYSIS: ModelAnalysis = {
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

/**
 * Deterministic, schema-valid fixture provider. Used whenever AI_MOCK_MODE=true and in all
 * automated tests, regardless of whether an ANTHROPIC_API_KEY is configured (IMPLEMENTATION_PLAN.md
 * Section 6.3: standard tests must never call the paid Anthropic API).
 */
export class MockAnalysisProvider implements MathAnalysisProvider {
  async analyzeQuestion(_input: AnalyzeQuestionInput): Promise<ModelAnalysis> {
    return structuredClone(MOCK_ANALYSIS);
  }

  /** Offline allowlist only: never approves arbitrary mathematical content. */
  async reviewAnalysis(_input: AnalyzeQuestionInput, candidate: ModelAnalysis) {
    const approved = isDeepStrictEqual(candidate, MOCK_ANALYSIS);
    return analysisReviewSchema.parse(Object.fromEntries(Object.keys(analysisReviewSchema.shape).map((key) => [key, approved])));
  }

  async reviewProbePair(input: GenerateProbePairInput, candidate: ModelProbePair) {
    const approved = isDeepStrictEqual(candidate, MOCK_PAIRS[input.stepIndex])
      && isDeepStrictEqual(input.plan, MOCK_PLAN)
      && input.parsedQuestionMarkdown === MOCK_ANALYSIS.parsedQuestionMarkdown;
    return probeReviewSchema.parse(Object.fromEntries(Object.keys(probeReviewSchema.shape).map((key) => [key, approved])));
  }

  async generateProbePair(input: GenerateProbePairInput): Promise<ModelProbePair> {
    const pair = MOCK_PAIRS[input.stepIndex];
    if (!pair) throw new Error(`Mock provider has no probe pair for step ${input.stepIndex}`);
    return structuredClone(pair);
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

  async summarizeSession(input: SummarizeSessionInput): Promise<ModelSessionSummary> {
    const header = input.transcriptText.match(/^Session:\s*(.+)$/m)?.[1].trim();
    return {
      title: (header || `Session on ${input.sessionDate}`).slice(0, 80),
      summary: `Mock summary of the ${input.sessionDate} session with ${input.whiteboards.length} whiteboard image(s). Practiced solving linear equations.`,
      observations: structuredClone(MOCK_OBSERVATIONS),
    };
  }

  /** Groups observations with the same text into one active item citing every session. */
  async buildLearnerProfile(input: BuildLearnerProfileInput): Promise<ModelLearnerProfile> {
    const items = new Map<string, ModelLearnerProfile['items'][number]>();
    for (const session of input.sessions) {
      for (const observation of session.observations) {
        const item = items.get(observation.text) ?? { category: observation.category, text: observation.text, status: 'active', evidence: [] };
        item.evidence.push({ sessionId: session.sessionId, ...(observation.quote ? { quote: observation.quote } : {}) });
        items.set(observation.text, item);
      }
    }
    const grouped = [...items.values()].slice(0, 20);
    const struggle = grouped.find((item) => item.category === 'struggle');
    return { nextFocus: struggle ? `Revisit: ${struggle.text}` : '', items: grouped };
  }

  /** Cites the first three profile items with their evidence dates; `[]` for an empty profile. */
  async relevantHistory(input: RelevantHistoryInput): Promise<ModelHistory> {
    return {
      bullets: input.profile.items.slice(0, 3).map((item) =>
        item.evidence.length > 0 ? `${item.text} Seen ${item.evidence.map((entry) => entry.date).join(', ')}.` : item.text),
    };
  }
}
