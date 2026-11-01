import { expect, it, vi } from "vitest";
import { AnthropicAnalysisProvider } from "@/server/ai/anthropic-provider";
import { EXAMPLE_QUESTIONS } from "@/lib/example-data";

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
