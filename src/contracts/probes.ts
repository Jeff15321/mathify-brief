export const OPTION_IDS = ['A', 'B', 'C', 'D'] as const;
export type OptionId = (typeof OPTION_IDS)[number];

export interface PublicProbe {
  hint?: string;
  id: string;
  concept: string;
  questionMarkdown: string;
  options: { id: OptionId; textMarkdown: string }[];
}

/** A student's response to one probe: one of the generated options, or "I don't know". */
export type ProbeAnswer = OptionId | 'IDK';

/** Which probe of a step: the main question, or its easier retry. */
export type ProbeKind = 'main' | 'easier';

/** Generation state of a step's probe pair. */
export type StepStatus = 'pending' | 'generating' | 'ready' | 'failed';

/** Student-safe view of the one-question-at-a-time flow. Never contains answer keys or unserved probes. */
export interface PublicProbing {
  revision: string;               // workspace updatedAt; lets the client ignore stale responses
  current: PublicProbe | null;
  progress: { stepNumber: number; totalSteps: number; isEasier: boolean } | null;
  waitingStatus: StepStatus | null; // status of the step under the cursor when `current` is not ready
  finished: boolean;
  needsPrefetch: boolean;         // a pending step within the buffer window still needs generating
}
