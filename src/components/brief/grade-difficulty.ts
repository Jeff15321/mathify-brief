import type { GradeDifficulty } from "@/contracts/workspace";

export const GRADE_DIFFICULTY_LABEL: Record<GradeDifficulty, string> = {
  below_grade: "Below Grade Level",
  on_grade: "On Grade Level",
  stretch: "Above Grade Level",
  uncertain: "Unclear",
};

export const GRADE_DIFFICULTY_CLASS: Record<GradeDifficulty, string> = {
  below_grade: "bg-fill text-ink",
  on_grade: "bg-fill text-ink",
  stretch: "bg-wash text-ink",
  uncertain: "bg-fill text-muted",
};
