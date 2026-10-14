import { QuestionDisplay } from "./QuestionDisplay";
import { MathText } from "@/components/shared/MathText";
import type { QuestionAnalysisPublic, StoredAsset } from "@/types/domain";

const DIFFICULTY_LABEL: Record<QuestionAnalysisPublic["gradeDifficulty"], string> = {
  below_grade: "Below grade",
  on_grade: "On grade level",
  stretch: "Stretch",
  uncertain: "Uncertain",
};

const DIFFICULTY_CLASS: Record<QuestionAnalysisPublic["gradeDifficulty"], string> = {
  below_grade: "bg-amber-50 text-amber-700",
  on_grade: "bg-emerald-50 text-emerald-700",
  stretch: "bg-purple-50 text-purple-700",
  uncertain: "bg-slate-100 text-slate-600",
};

export function BreakdownPanel({
  analysis,
  questionText,
  attachments,
}: {
  analysis: QuestionAnalysisPublic;
  questionText: string;
  attachments: StoredAsset[];
}) {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Question breakdown</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700">
            Grade 9
          </span>
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">
            {analysis.topic}
          </span>
          <span className={`rounded-full px-2 py-0.5 font-medium ${DIFFICULTY_CLASS[analysis.gradeDifficulty]}`}>
            {DIFFICULTY_LABEL[analysis.gradeDifficulty]}
          </span>
        </div>
      </div>

      <QuestionDisplay
        questionText={questionText}
        parsedQuestionMarkdown={analysis.parsedQuestionMarkdown}
        attachments={attachments}
      />

      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Concepts to review
        </h3>
        <ol className="flex flex-col gap-3">
          {analysis.breakdown.map((step, index) => (
            <li key={index} className="flex gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
              <span className="font-semibold text-blue-500">{index + 1}.</span>
              <div>
                <p className="font-medium text-slate-900">{step.title}</p>
                <MathText text={step.description} className="text-slate-600" />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
