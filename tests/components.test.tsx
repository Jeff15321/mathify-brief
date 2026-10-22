import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ProbeCard } from "@/components/workspace/ProbeCard";
import { ProbingPanel } from "@/components/workspace/ProbingPanel";
import { QuestionDisplay } from "@/components/workspace/QuestionDisplay";
import { ThreePanelLayout } from "@/components/workspace/ThreePanelLayout";
import { ProbeTallyCard } from "@/components/brief/ProbeTallyCard";
import { PriorityStepCard } from "@/components/brief/PriorityStepCard";
import { ProbingResultsAccordion } from "@/components/brief/ProbingResultsAccordion";
import type { ProbeOutcome, ProbeResult, PublicProbe, PublicProbing } from "@/types/domain";

const PROBE: PublicProbe = {
  id: "q1",
  concept: "Distributive property",
  questionMarkdown: "What is $2(x+3)$ expanded?",
  options: [
    { id: "A", textMarkdown: "$2x + 3$" },
    { id: "B", textMarkdown: "$2x + 6$" },
    { id: "C", textMarkdown: "$x + 6$" },
    { id: "D", textMarkdown: "$2x + 5$" },
  ],
};

describe("ProbeCard", () => {
  it("a selected radio choice stays checked and reports the selection", () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <ProbeCard probe={PROBE} index={0} selected={undefined} onSelect={onSelect} onNext={() => {}} />,
    );

    const optionB = screen.getByDisplayValue("B") as HTMLInputElement;
    fireEvent.click(optionB);
    expect(onSelect).toHaveBeenCalledWith("B");

    rerender(<ProbeCard probe={PROBE} index={0} selected="B" onSelect={onSelect} onNext={() => {}} />);
    expect((screen.getByDisplayValue("B") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByDisplayValue("A") as HTMLInputElement).checked).toBe(false);
  });

  it("offers an \"I don't know\" choice that stays selected", () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <ProbeCard probe={PROBE} index={0} selected={undefined} onSelect={onSelect} onNext={() => {}} />,
    );

    fireEvent.click(screen.getByLabelText("I don't know"));
    expect(onSelect).toHaveBeenCalledWith("IDK");

    rerender(<ProbeCard probe={PROBE} index={0} selected="IDK" onSelect={onSelect} onNext={() => {}} />);
    expect((screen.getByLabelText("I don't know") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByDisplayValue("B") as HTMLInputElement).checked).toBe(false);
  });

  it("renders long question/option text without truncation (no fixed-height card)", () => {
    const longProbe: PublicProbe = {
      ...PROBE,
      questionMarkdown: "A very long word problem. ".repeat(20),
    };
    render(<ProbeCard probe={longProbe} index={0} selected={undefined} onSelect={() => {}} onNext={() => {}} />);
    expect(screen.getByText(/A very long word problem\./)).toBeInTheDocument();
  });
});

function probingState(overrides: Partial<PublicProbing> = {}): PublicProbing {
  return {
    revision: "r1",
    current: PROBE,
    progress: { stepNumber: 1, totalSteps: 3, isEasier: false },
    waitingStatus: null,
    finished: false,
    needsPrefetch: false,
    ...overrides,
  };
}

function renderPanel(probing: PublicProbing, selection?: "A" | "B" | "C" | "D" | "IDK") {
  const handlers = { onSelect: vi.fn(), onNext: vi.fn(), onRetry: vi.fn(), onSubmit: vi.fn() };
  render(
    <ProbingPanel probing={probing} selection={selection} answering={false} submitting={false} {...handlers} />,
  );
  return handlers;
}

describe("ProbingPanel", () => {
  it("shows one question with progress, and Next is disabled until a choice is selected", () => {
    renderPanel(probingState());
    expect(screen.getByText("Question 1 of 3")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("enables Next once selected and reports the click", () => {
    const { onNext } = renderPanel(probingState(), "B");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onNext).toHaveBeenCalled();
  });

  it("marks an easier retry with a badge", () => {
    renderPanel(probingState({ progress: { stepNumber: 1, totalSteps: 3, isEasier: true } }));
    expect(screen.getByText("Easier question")).toBeInTheDocument();
  });

  it("shows a waiting state while the next question is being generated", () => {
    renderPanel(probingState({ current: null, waitingStatus: "generating" }));
    expect(screen.getByText("Preparing your next question…")).toBeInTheDocument();
  });

  it("offers Retry when generation failed", () => {
    const { onRetry } = renderPanel(probingState({ current: null, waitingStatus: "failed" }));
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
  });

});

describe("QuestionDisplay", () => {
  it("defaults to Parsed and toggles to Original on click", () => {
    render(
      <QuestionDisplay
        questionText="raw typed text"
        parsedQuestionMarkdown="parsed version"
        attachments={[]}
      />,
    );

    expect(screen.getByText("parsed version")).toBeInTheDocument();
    expect(screen.queryByText("raw typed text")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Original"));

    expect(screen.getByText("raw typed text")).toBeInTheDocument();
    expect(screen.queryByText("parsed version")).not.toBeInTheDocument();
  });
});

describe("ThreePanelLayout", () => {
  it("expanding/restoring a panel does not unmount its children (input state survives)", () => {
    render(
      <ThreePanelLayout
        whiteboard={<input data-testid="wb-input" />}
        probing={<div>probing</div>}
      />,
    );

    const input = screen.getByTestId("wb-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "hello" } });
    expect(input.value).toBe("hello");

    fireEvent.click(screen.getByLabelText("Expand Whiteboard"));
    expect((screen.getByTestId("wb-input") as HTMLInputElement).value).toBe("hello");

    fireEvent.click(screen.getByLabelText("Restore Whiteboard"));
    expect((screen.getByTestId("wb-input") as HTMLInputElement).value).toBe("hello");
  });
});

function briefResult(kind: "main" | "easier", outcome: ProbeOutcome): ProbeResult {
  const picked = outcome === "correct" ? "C" : outcome === "incorrect" ? "B" : null;
  return {
    probeId: `s1-${kind}`,
    stepIndex: 0,
    kind,
    concept: "Dividing out a common factor",
    questionMarkdown: kind === "main" ? "Divide $8x^2 - 24x + 40 = 0$ by its GCF." : "Divide $2x + 4 = 0$ by 2.",
    selectedOptionId: picked,
    selectedOptionText: picked === "C" ? "$x^2 - 3x + 5 = 0$" : picked === "B" ? "$4x^2 - 12x + 20 = 0$" : null,
    correctOptionId: "C",
    correctOptionText: "$x^2 - 3x + 5 = 0$",
    isCorrect: outcome === "correct" ? true : outcome === "incorrect" ? false : null,
    outcome,
    explanation: "The GCF is 8.",
  };
}

describe("Tutor Brief cards", () => {
  it("ProbeTallyCard shows correct/attempted, coverage and misses", () => {
    render(<ProbeTallyCard title="Core probes" tally={{ total: 4, attempted: 4, correct: 1, incorrect: 2, dontKnow: 1 }} emptyLabel="None" />);
    expect(screen.getByText("1/4")).toBeInTheDocument();
    expect(screen.getByText("4 of 4 attempted")).toBeInTheDocument();
    expect(screen.getByText("2 incorrect · 1 don't know")).toBeInTheDocument();
  });

  it("ProbeTallyCard shows its empty label when there are no probes of that kind", () => {
    render(<ProbeTallyCard title="Easier retries" tally={{ total: 0, attempted: 0, correct: 0, incorrect: 0, dontKnow: 0 }} emptyLabel="No retries needed." />);
    expect(screen.getByText("No retries needed.")).toBeInTheDocument();
  });

  it("PriorityStepCard shows the concept, the student's pick vs the correct answer, and the retry result", () => {
    render(<PriorityStepCard results={[briefResult("main", "incorrect"), briefResult("easier", "incorrect")]} priorityStepIndex={0} />);
    expect(screen.getByText("Dividing out a common factor")).toBeInTheDocument();
    expect(screen.getByText("Student selected · B")).toBeInTheDocument();
    expect(screen.getByText("Correct · C")).toBeInTheDocument();
    expect(screen.getByText(/Easier retry also incorrect · 0\/2 correct for this concept/)).toBeInTheDocument();
  });

  it("PriorityStepCard has distinct empty states for no misses and no evidence", () => {
    const { unmount } = render(<PriorityStepCard results={[briefResult("main", "correct")]} priorityStepIndex={null} />);
    expect(screen.getByText(/No incorrect steps/)).toBeInTheDocument();
    unmount();
    render(<PriorityStepCard results={[briefResult("main", "unanswered")]} priorityStepIndex={null} />);
    expect(screen.getByText("Not enough evidence yet.")).toBeInTheDocument();
  });

  it("ProbingResultsAccordion starts collapsed and expands on click", () => {
    const { container } = render(
      <ProbingResultsAccordion results={[briefResult("main", "incorrect"), briefResult("easier", "correct")]} notReachedConcepts={["Factoring"]} />,
    );
    const details = container.querySelector("details")!;
    expect(details.open).toBe(false);
    expect(screen.getByText(/2 concepts · 2 total responses/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Probing results"));
    expect(details.open).toBe(true);
    expect(screen.getByText("Easier retry")).toBeInTheDocument();
  });
});
