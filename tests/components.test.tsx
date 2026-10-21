import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ProbeCard } from "@/components/workspace/ProbeCard";
import { QuestionDisplay } from "@/components/workspace/QuestionDisplay";
import { ThreePanelLayout } from "@/components/workspace/ThreePanelLayout";
import type { PublicProbe } from "@/types/domain";

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
      <ProbeCard probe={PROBE} index={0} selected={undefined} onSelect={onSelect} />,
    );

    const optionB = screen.getByDisplayValue("B") as HTMLInputElement;
    fireEvent.click(optionB);
    expect(onSelect).toHaveBeenCalledWith("B");

    rerender(<ProbeCard probe={PROBE} index={0} selected="B" onSelect={onSelect} />);
    expect((screen.getByDisplayValue("B") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByDisplayValue("A") as HTMLInputElement).checked).toBe(false);
  });

  it("offers an \"I don't know\" choice that stays selected", () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <ProbeCard probe={PROBE} index={0} selected={undefined} onSelect={onSelect} />,
    );

    fireEvent.click(screen.getByLabelText("I don't know"));
    expect(onSelect).toHaveBeenCalledWith("IDK");

    rerender(<ProbeCard probe={PROBE} index={0} selected="IDK" onSelect={onSelect} />);
    expect((screen.getByLabelText("I don't know") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByDisplayValue("B") as HTMLInputElement).checked).toBe(false);
  });

  it("renders long question/option text without truncation (no fixed-height card)", () => {
    const longProbe: PublicProbe = {
      ...PROBE,
      questionMarkdown: "A very long word problem. ".repeat(20),
    };
    render(<ProbeCard probe={longProbe} index={0} selected={undefined} onSelect={() => {}} />);
    expect(screen.getByText(/A very long word problem\./)).toBeInTheDocument();
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
        breakdown={<div>breakdown</div>}
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
