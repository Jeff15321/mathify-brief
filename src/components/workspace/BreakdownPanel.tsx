import { QuestionDisplay } from "./QuestionDisplay";
import { MathText } from "@/components/shared/MathText";
import { GRADE_DIFFICULTY_CLASS, GRADE_DIFFICULTY_LABEL } from "@/lib/grade-difficulty";
import type { QuestionAnalysisPublic, StoredAsset } from "@/types/domain";

export function BreakdownPanel({
  analysis,
  studentGrade,
  questionText,
  attachments,
}: {
  analysis: QuestionAnalysisPublic;
  studentGrade: number;
  questionText: string;
  attachments: StoredAsset[];
}) {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Question breakdown</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700">
            Student: Grade {studentGrade}
          </span>
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-medium text-indigo-700">
            Question: {analysis.estimatedQuestionGrade}
          </span>
          <span className={`rounded-full px-2 py-0.5 font-medium ${GRADE_DIFFICULTY_CLASS[analysis.gradeDifficulty]}`}>
            {GRADE_DIFFICULTY_LABEL[analysis.gradeDifficulty]}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
            {analysis.topic}
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
