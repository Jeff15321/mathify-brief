import { GRADE_DIFFICULTY_CLASS, GRADE_DIFFICULTY_LABEL } from "./grade-difficulty";
import type { GradeDifficulty } from "@/contracts/workspace";
import { Badge } from "@/components/shared/Card";

/** Brief title with the student and question grade badges. */
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
      <h1 className="page-title">Tutor Brief</h1>
      <div className="flex flex-wrap gap-2">
        <Badge className="bg-wash text-ink">Student · Grade {studentGrade}</Badge>
        <Badge className="bg-fill text-ink">Question · {questionGrade}</Badge>
        <Badge className={GRADE_DIFFICULTY_CLASS[gradeDifficulty]}>{GRADE_DIFFICULTY_LABEL[gradeDifficulty]}</Badge>
        <Badge className="bg-fill text-muted">{topic}</Badge>
      </div>
    </header>
  );
}
