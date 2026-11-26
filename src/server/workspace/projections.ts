import type { QuestionAnalysisPublic } from '@/contracts/workspace';
import type { PublicProbe } from '@/contracts/probes';
import type { PrivateProbe, QuestionAnalysisStored } from './schema';

export function toPublicProbe(probe: PrivateProbe): PublicProbe {
  return {
    hint: probe.hint,
    id: probe.id,
    concept: probe.concept,
    questionMarkdown: probe.questionMarkdown,
    options: probe.options,
  };
}

export function toPublicAnalysis(analysis: QuestionAnalysisStored): QuestionAnalysisPublic {
  return {
    preparationDurationMs: analysis.preparationDurationMs,
    concepts: analysis.probePlan.map(item => item.concept),
    parsedQuestionMarkdown: analysis.parsedQuestionMarkdown,
    topic: analysis.topic,
    estimatedQuestionGrade: analysis.estimatedQuestionGrade,
    gradeDifficulty: analysis.gradeDifficulty,
    breakdown: analysis.breakdown,
  };
}
