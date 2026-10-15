import type { GradeDifficulty } from "@/types/domain";

export const GRADE_DIFFICULTY_LABEL: Record<GradeDifficulty, string> = {
  below_grade: "Below Grade Level",
  on_grade: "On Grade Level",
  stretch: "Above Grade Level",
  uncertain: "Unclear",
};

export const GRADE_DIFFICULTY_CLASS: Record<GradeDifficulty, string> = {
  below_grade: "bg-sky-100 text-sky-700",
  on_grade: "bg-emerald-100 text-emerald-700",
  stretch: "bg-amber-100 text-amber-700",
  uncertain: "bg-slate-100 text-slate-600",
};
