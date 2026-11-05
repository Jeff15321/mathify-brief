import type { ProbeResult } from "@/types/domain";

const DISPLAY_NAMES: Readonly<Record<string, string>> = {
  "Checking a solution by substitution": "Substitution check",
  "Dividing by the coefficient to solve ax = b": "Coefficient division",
};

function displayName(concept: string): string {
  return Object.hasOwn(DISPLAY_NAMES, concept) ? DISPLAY_NAMES[concept] : concept;
}

const CATEGORIES = [
  { id: "incorrect-or-unsure", label: "Incorrect or unsure" },
  { id: "simpler-correct", label: "Correct on simpler question" },
  { id: "main-correct", label: "Correct on first try" },
  { id: "unanswered", label: "Unanswered" },
  { id: "not-reached", label: "Not reached" },
] as const;

export type ConceptEvidenceEntry = {
  id: string;
  concept: string;
  displayName: string;
  main: ProbeResult | undefined;
  easier: ProbeResult | undefined;
  notReached: boolean;
};

function categoryIndex({ main, easier, notReached }: ConceptEvidenceEntry): number {
  if (notReached) return 4;
  if (main?.outcome === "correct") return 2;
  if (easier?.outcome === "correct") return 1;
  if ([main, easier].some((result) => result?.outcome === "incorrect" || result?.outcome === "dont_know")) return 0;
  return 3;
}

/** Group presentation entries only; original result objects and anchor identities stay intact. */
export function groupedConceptEvidence(results: ProbeResult[], notReachedConcepts: string[]) {
  const entries: ConceptEvidenceEntry[] = [...new Set(results.map((result) => result.stepIndex))].map((stepIndex) => {
    const main = results.find((result) => result.stepIndex === stepIndex && result.kind === "main");
    const easier = results.find((result) => result.stepIndex === stepIndex && result.kind === "easier");
    const concept = (main ?? easier)!.concept;
    return { id: `probe-step-${stepIndex}`, concept, displayName: displayName(concept), main, easier, notReached: false };
  });
  entries.push(...notReachedConcepts.map((concept, index) => ({
    id: `not-reached-${index}`, concept, displayName: displayName(concept), main: undefined, easier: undefined, notReached: true,
  })));
  return CATEGORIES.map((category, index) => ({
    ...category,
    concepts: entries.filter((entry) => categoryIndex(entry) === index)
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "en", { sensitivity: "base", numeric: true })),
  })).filter((group) => group.concepts.length > 0);
}

