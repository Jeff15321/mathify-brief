import type { QuestionAnalysisStored, ProbeStep } from "@/types/domain";
import { getAnalysisProvider } from "./ai";
import { z } from "zod";

const validationIssueSchema = z.object({
  severity: z.enum(["warning", "error"]),
  message: z.string().min(1),
  probeId: z.string().nullable().optional(),
});

const breakdownValidationSchema = z.object({
  issues: z.array(validationIssueSchema),
});

const probesValidationSchema = z.object({
  issues: z.array(validationIssueSchema),
});

export type ValidationIssue = z.infer<typeof validationIssueSchema>;

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
  files: { fileName: string; mimeType: string; bytes: Buffer }[] = [],
): Promise<ValidationResult> {
  if (process.env.AI_VALIDATION_ENABLED !== "true") {
    return { status: "skipped", issues: [] };
  }

  try {
    const provider = getAnalysisProvider();
    const raw = await (provider as unknown as Record<string, unknown>).validateBreakdown
      ? await (provider as unknown as { validateBreakdown: (input: unknown) => Promise<unknown> }).validateBreakdown({
          questionText,
          analysis,
          files,
        })
      : { issues: [] };

    const parsed = breakdownValidationSchema.safeParse(raw);
    if (!parsed.success) {
      return { status: "failed", issues: [{ severity: "warning", message: "Validation output was malformed" }] };
    }
    return { status: "done", issues: parsed.data.issues };
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
  files: { fileName: string; mimeType: string; bytes: Buffer }[] = [],
): Promise<ValidationResult> {
  if (process.env.AI_VALIDATION_ENABLED !== "true") {
    return { status: "skipped", issues: [] };
  }

  try {
    const provider = getAnalysisProvider();
    const raw = await (provider as unknown as Record<string, unknown>).validateProbes
      ? await (provider as unknown as { validateProbes: (input: unknown) => Promise<unknown> }).validateProbes({
          questionText,
          steps,
          files,
        })
      : { issues: [] };

    const parsed = probesValidationSchema.safeParse(raw);
    if (!parsed.success) {
      return { status: "failed", issues: [{ severity: "warning", message: "Validation output was malformed" }] };
    }
    return { status: "done", issues: parsed.data.issues };
  } catch (err) {
    return {
      status: "failed",
      issues: [{ severity: "warning", message: `Validation call failed: ${err instanceof Error ? err.message : String(err)}` }],
    };
  }
}
