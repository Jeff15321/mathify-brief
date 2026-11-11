import type { QuestionAnalysisPublic } from '@/types/domain';
/** Visible roadmap from the actual probe plan; breakdown steps need not have matching indices. */
export function BreakdownPanel({ analysis }: { analysis: QuestionAnalysisPublic }) {
  return <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-slate-700">
    <strong>Skills we’ll check:</strong> {analysis.concepts?.join(' · ')}
  </div>;
}
