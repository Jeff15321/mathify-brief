import { beforeEach, expect, it, vi } from "vitest";
import { AnthropicAnalysisProvider } from "@/server/ai/anthropic-provider";
import { EXAMPLE_QUESTIONS } from "@/lib/example-data";
import { validationIssueSchema } from "@/schemas/workspace";

const create = vi.hoisted(() => vi.fn<(input: {
  messages: Array<{ content: Array<{ type: string; text?: string }> }>;
}) => Promise<{
  stop_reason: string;
  content: Array<{ type: string; text: string }>;
}>>());

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create };
  },
}));

beforeEach(() => {
  create.mockReset();
});

it("sends main and easier hints/explanations to the reviewer without a live API call", async () => {
  create.mockResolvedValue({ stop_reason: "end_turn", content: [{ type: "text", text: '{"issues":[]}' }] });
  const example = EXAMPLE_QUESTIONS[0];
  const provider = new AnthropicAnalysisProvider();
  expect(await provider.validateProbes({
    questionText: example.questionText,
    steps: example.probeSteps,
    files: [],
  })).toEqual({ issues: [] });
  const payload = create.mock.calls[0][0].messages
    .flatMap(message => message.content.map(block => block.text ?? "")).join("\n");
  for (const step of example.probeSteps) {
    expect(payload).toContain(step.main!.hint);
    expect(payload).toContain(step.easier!.hint);
    expect(payload).toContain(step.easier!.explanation);
  }
});

it("parses categorized validation findings", async () => {
  create.mockResolvedValue({
    stop_reason: "end_turn",
    content: [{
      type: "text",
      text: JSON.stringify({
        issues: [{
          severity: "warning",
          category: "hint_leak",
          message: "The hint reveals the keyed option.",
          probeId: "probe-main",
        }],
      }),
    }],
  });
  const example = EXAMPLE_QUESTIONS[0];
  const result = await new AnthropicAnalysisProvider().validateProbes({
    questionText: example.questionText,
    steps: example.probeSteps,
    files: [],
  });

  expect(result.issues[0]?.category).toBe("hint_leak");
});

it("requires categories from new model output but accepts older stored issues", async () => {
  create.mockResolvedValue({
    stop_reason: "end_turn",
    content: [{
      type: "text",
      text: JSON.stringify({
        issues: [{
          severity: "warning",
          message: "The hint reveals the keyed option.",
          probeId: "probe-main",
        }],
      }),
    }],
  });
  const example = EXAMPLE_QUESTIONS[0];
  await expect(new AnthropicAnalysisProvider().validateProbes({
    questionText: example.questionText,
    steps: example.probeSteps,
    files: [],
  })).rejects.toThrow();

  expect(validationIssueSchema.parse({
    severity: "warning",
    message: "An older saved issue has no category.",
  })).toEqual({
    severity: "warning",
    message: "An older saved issue has no category.",
  });
});
