import { GRADE_DIFFICULTY_CLASS, GRADE_DIFFICULTY_LABEL } from "@/lib/grade-difficulty";
import type { GradeDifficulty } from "@/types/domain";
import { BriefBadge } from "./BriefCard";

/** Brief title with the ready status and the student/question grade badges. */
export function BriefHeader({
  studentGrade,
  questionGrade,
  gradeDifficulty,
  topic,
}: {
  studentGrade: number;
  questionGrade: string;
  gradeDifficulty: GradeDifficulty;
  topic: string;
}) {
  return (
    <header className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-slate-900">Tutor Brief</h1>
        <BriefBadge className="bg-emerald-100 text-emerald-700">Ready for tutor</BriefBadge>
      </div>
      <div className="flex flex-wrap gap-2">
        <BriefBadge className="bg-blue-100 text-blue-700">Student · Grade {studentGrade}</BriefBadge>
        <BriefBadge className="bg-indigo-100 text-indigo-700">Question · {questionGrade}</BriefBadge>
        <BriefBadge className={GRADE_DIFFICULTY_CLASS[gradeDifficulty]}>{GRADE_DIFFICULTY_LABEL[gradeDifficulty]}</BriefBadge>
        <BriefBadge className="bg-slate-100 text-slate-600">{topic}</BriefBadge>
      </div>
    </header>
  );
}
