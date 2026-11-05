import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ProbeCard } from "@/components/workspace/ProbeCard";
import { ProbingPanel } from "@/components/workspace/ProbingPanel";
import { QuestionDisplay } from "@/components/workspace/QuestionDisplay";
import { ThreePanelLayout } from "@/components/workspace/ThreePanelLayout";
import { ConceptChecks } from "@/components/brief/ConceptChecks";
import { CurrentQuestionCard } from "@/components/brief/CurrentQuestionCard";
import { BriefHeader } from "@/components/brief/BriefHeader";
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

describe("Tutor Brief evidence", () => {
  it("puts the subject in the main heading", () => {
    render(<BriefHeader topic="Linear equations" studentGrade={9} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Linear equations");
    expect(screen.getByText("Tutor brief · Student grade 9")).toBeVisible();
  });

  it("groups overview and evidence identically, alphabetizes within groups, and preserves identities", () => {
    const cases: [string, ProbeOutcome, ProbeOutcome | null][] = [
      ["Zulu retry", "incorrect", "correct"],
      ["Beta unresolved", "dont_know", "unanswered"],
      ["Alpha unresolved", "incorrect", "incorrect"],
      ["Alpha retry", "dont_know", "correct"],
      ["Zeta correct", "correct", "incorrect"],
      ["Alpha correct", "correct", null],
      ["Beta unanswered", "unanswered", "unanswered"],
      ["Alpha unanswered", "unanswered", null],
    ];
    const results = cases.flatMap(([concept, main, easier], stepIndex) => [
      { ...briefResult("main", main), concept, stepIndex, probeId: `s${stepIndex}-main` },
      ...(easier ? [{ ...briefResult("easier", easier), concept, stepIndex, probeId: `s${stepIndex}-easier` }] : []),
    ]);
    const notReached = ["Zeta not reached", "Alpha not reached"];
    const originalOrder = results.map((result) => result.probeId);
    Object.freeze(results);
    results.forEach(Object.freeze);
    Object.freeze(notReached);
    render(<ConceptChecks results={results} notReachedConcepts={notReached} />);
    const summary = screen.getByRole("region", { name: "Response summary" });
    expect(within(summary).getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([
      "Incorrect or unsure", "Correct on simpler question", "Correct on first try", "Unanswered", "Not reached",
    ]);
    const rows = within(summary).getAllByRole("listitem");
    const details = rows.map((row) => row.querySelector("details")!);
    const names = details.map((detail) => detail.querySelector("summary h3")!.textContent);
    expect(names).toEqual([
      "Alpha unresolved", "Beta unresolved", "Alpha retry", "Zulu retry", "Alpha correct", "Zeta correct", "Alpha unanswered", "Beta unanswered", "Alpha not reached", "Zeta not reached",
    ]);
    const ids = ["probe-step-2", "probe-step-1", "probe-step-3", "probe-step-0", "probe-step-5", "probe-step-4", "probe-step-7", "probe-step-6", "not-reached-1", "not-reached-0"];
    expect(details.map((detail) => detail.id)).toEqual(ids);
    expect(details.every((detail) => !detail.open)).toBe(true);
    expect(details[1].querySelector("summary")).toHaveTextContent(/First try.*Unsure.*Simpler follow-up.*Unanswered/);
    expect(details[2].querySelector("summary")).toHaveTextContent(/First try.*Unsure.*Simpler follow-up.*Correct/);
    expect(details[5].querySelector("summary")).toHaveTextContent(/First try.*Correct.*Simpler follow-up.*Incorrect/);
    expect(results.map((result) => result.probeId)).toEqual(originalOrder);
    expect(notReached).toEqual(["Zeta not reached", "Alpha not reached"]);
  });

  it("sorts concise display names while preserving original names and paired evidence", () => {
    const concepts = ["Checking a solution by substitution", "Inverse operations", "Dividing by the coefficient to solve ax = b"];
    const results = concepts.flatMap((concept, stepIndex) => [
      { ...briefResult("main", "incorrect"), concept, stepIndex, probeId: `s${stepIndex}-main` },
      { ...briefResult("easier", "correct"), concept, stepIndex, probeId: `s${stepIndex}-easier` },
    ]);
    results.forEach(Object.freeze);
    Object.freeze(results);
    render(<ConceptChecks results={results} notReachedConcepts={[]} />);
    const rows = screen.getAllByRole("listitem").map((row) => row.querySelector("details")!);
    expect(rows.map((row) => row.querySelector("summary h3")!.textContent)).toEqual([
      "Coefficient division", "Inverse operations", "Substitution check",
    ]);
    expect(rows.map((row) => row.id)).toEqual(["probe-step-2", "probe-step-1", "probe-step-0"]);
    const title = within(rows[2]).getByRole("heading", { name: "Substitution check" });
    expect(title).toHaveAttribute("title", concepts[0]);
    fireEvent.click(title);
    expect(within(rows[2]).getByText(concepts[0], { exact: true })).toBeVisible();
    const main = within(rows[2]).getByRole("region", { name: `Main question: ${concepts[0]}` });
    const easier = within(rows[2]).getByRole("region", { name: `Simpler question: ${concepts[0]}` });
    expect(within(main).getByText("Student answer")).toBeVisible();
    expect(within(easier).getByText("Student answer")).toBeVisible();
    expect(results[0].concept).toBe(concepts[0]);
  });

  it("preserves mixed simpler outcomes with their concepts", () => {
    const results = (["correct", "incorrect", "dont_know", "unanswered"] as const).flatMap((outcome, index) => [
      { ...briefResult("main", "incorrect"), probeId: `s${index}-main`, stepIndex: index, concept: `Concept ${index}` },
      { ...briefResult("easier", outcome), probeId: `s${index}-easier`, stepIndex: index, concept: `Concept ${index}` },
    ]);
    render(<ConceptChecks results={results} notReachedConcepts={[]} />);
    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent(/Incorrect.*Incorrect/);
    expect(rows[1]).toHaveTextContent(/Incorrect.*Unsure/);
    expect(rows[2]).toHaveTextContent(/Incorrect.*Unanswered/);
    expect(rows[3]).toHaveTextContent(/Incorrect.*Correct/);
    expect(screen.queryByRole("heading", { name: "Correct on first try" })).not.toBeInTheDocument();
  });

  it("distinguishes correct, unanswered, unreached and unserved follow-ups", () => {
    const results = [briefResult("main", "correct"), { ...briefResult("main", "unanswered"), probeId: "s2-main", stepIndex: 1, concept: "Substitution" }];
    render(<ConceptChecks results={results} notReachedConcepts={["Division"]} />);
    expect(within(screen.getByRole("heading", { name: "Dividing out a common factor" }).closest("summary")!).getByText("Correct")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Unanswered" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Division" }).closest("details")).toHaveAttribute("id", "not-reached-0");
    expect(screen.getByRole("heading", { name: "Not reached" })).toBeVisible();
    expect(screen.getAllByText("Not served")).toHaveLength(3);

  });

  it("reports an empty result set without instructional or diagnostic text", () => {
    render(<ConceptChecks results={[]} notReachedConcepts={[]} />);
    expect(screen.getByText("No question evidence recorded.")).toBeVisible();
  });

  it("discloses original text and uploaded images directly", () => {
    const { rerender } = render(<CurrentQuestionCard questionText="Original student wording" parsedQuestionMarkdown="Parsed wording" attachments={[]} whiteboardAsset={null} />);
    expect(screen.getByText("Original student wording")).not.toBeVisible();
    fireEvent.click(screen.getByText("Original problem & student work"));
    expect(screen.getByText("Original student wording")).toBeVisible();
    expect(screen.queryByText("Parsed wording")).not.toBeInTheDocument();
    rerender(<CurrentQuestionCard questionText="" parsedQuestionMarkdown="Transcribed problem" attachments={[{ id: "image", kind: "attachment", fileName: "question.png", mimeType: "image/png", sizeBytes: 10, createdAt: "2026-01-01" }]} whiteboardAsset={null} />);
    expect(screen.getByText("Problem · transcribed from upload")).toBeVisible();
    expect(screen.getByText("Transcribed problem")).toBeVisible();
    expect(screen.getByAltText("question.png")).toBeVisible();
    expect(screen.getByRole("link", { name: /question.png · open original/ })).toHaveAttribute("href", "/api/assets/image");
  });

  it("opens only the selected row's question and answer pairs without key or rationale clutter", () => {
    const results = [briefResult("main", "incorrect"), briefResult("easier", "correct")];
    render(<ConceptChecks results={results} notReachedConcepts={["Factoring"]} />);
    const title = screen.getByRole("heading", { name: "Dividing out a common factor" });
    const details = title.closest("details")!;
    expect(details.open).toBe(false);
    expect(screen.getAllByText("Student answer").every((label) => label.closest("details")?.open === false)).toBe(true);
    fireEvent.click(title);
    expect(details.open).toBe(true);
    const main = screen.getByRole("region", { name: "Main question: Dividing out a common factor" });
    expect(within(main).getByText("Question")).toBeVisible();
    expect(within(main).getByText("Student answer")).toBeVisible();
    expect(main.querySelectorAll("annotation")[0]).toHaveTextContent("8x^2 - 24x + 40 = 0");
    expect(main.querySelectorAll("annotation")[1]).toHaveTextContent("4x^2 - 12x + 20 = 0");
    expect(within(main).queryByText(/Answer key|Answer rationale|Student answer ·/)).not.toBeInTheDocument();
    expect(within(main).queryByText("The GCF is 8.")).not.toBeInTheDocument();
    expect(within(main).queryByText("Incorrect")).not.toBeInTheDocument();
    const simpler = screen.getByRole("region", { name: "Simpler question: Dividing out a common factor" });
    expect(within(simpler).getByText("Student answer")).toBeVisible();
    expect(simpler.querySelectorAll("annotation")[0]).toHaveTextContent("2x + 4 = 0");
    expect(simpler.querySelectorAll("annotation")[1]).toHaveTextContent("x^2 - 3x + 5 = 0");
    expect(screen.getByRole("heading", { name: "Factoring" }).closest("details")!.open).toBe(false);
    fireEvent.click(title);
    expect(details.open).toBe(false);
    expect(within(main).getByText("Student answer")).not.toBeVisible();
    fireEvent.click(screen.getByRole("heading", { name: "Factoring" }));
    expect(screen.getByText("Not reached before submitting. No question or answer recorded.")).toBeVisible();
  });
});
