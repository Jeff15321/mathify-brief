import type { QuestionAnalysisStored, ProbeStep, ValidationIssue } from "@/types/domain";
import type { StoredFile } from "./ai/provider";
import { getAnalysisProvider } from "./ai";

export type { ValidationIssue };

export interface ValidationResult {
  status: "done" | "skipped" | "failed";
  issues: ValidationIssue[];
}

/**
 * Validates the question breakdown using a second AI call.
 * Controlled by AI_VALIDATION_ENABLED env var (default: false).
 */
export async function validateBreakdown(
  questionText: string,
  analysis: QuestionAnalysisStored,
  files: StoredFile[] = [],
): Promise<ValidationResult> {
  if (process.env.AI_VALIDATION_ENABLED !== "true") {
    return { status: "skipped", issues: [] };
  }

  try {
    const provider = getAnalysisProvider();
    const result = await provider.validateBreakdown({ questionText, analysis, files });
    return { status: "done", issues: result.issues };
  } catch (err) {
    return {
      status: "failed",
      issues: [{ severity: "warning", message: `Validation call failed: ${err instanceof Error ? err.message : String(err)}` }],
    };
  }
}

/**
 * Validates the generated probing questions using a second AI call.
 * Controlled by AI_VALIDATION_ENABLED env var (default: false).
 */
export async function validateProbes(
  questionText: string,
  steps: ProbeStep[],
  files: StoredFile[] = [],
): Promise<ValidationResult> {
  if (process.env.AI_VALIDATION_ENABLED !== "true") {
    return { status: "skipped", issues: [] };
  }

  try {
    const provider = getAnalysisProvider();
    const result = await provider.validateProbes({ questionText, steps, files });
    return { status: "done", issues: result.issues };
  } catch (err) {
    return {
      status: "failed",
      issues: [{ severity: "warning", message: `Validation call failed: ${err instanceof Error ? err.message : String(err)}` }],
    };
  }
}
