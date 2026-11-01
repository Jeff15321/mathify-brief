import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { TutorFeedbackForm } from "@/components/brief/TutorFeedbackForm";
import { ConfidenceCard } from "@/components/brief/ConfidenceCard";

afterEach(() => vi.unstubAllGlobals());

function rateAll() {
  for (const label of ["Overall usefulness", "Breakdown accuracy", "Probe quality"]) {
    fireEvent.click(within(screen.getByRole("group", { name: label })).getByRole("button", { name: "4 out of 5" }));
  }
}

describe("Tutor feedback", () => {
  it("requires ratings, labels optional comments, and confirms only a successful save", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<TutorFeedbackForm />);
    expect(screen.getByRole("button", { name: "Submit feedback" })).toBeDisabled();
    expect(screen.getByLabelText("Additional comments (optional)")).toHaveAttribute("maxLength", "5000");
    rateAll();
    fireEvent.click(screen.getByRole("button", { name: "Submit feedback" }));
    await screen.findByText(/Thank you for your feedback/);
    expect(fetchMock).toHaveBeenCalledWith("/api/feedback", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining('"overallUsefulness":4'),
    }));
  });

  it("surfaces HTTP rejections and keeps ratings/comments for retry", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "Feedback storage unavailable" } }), { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<TutorFeedbackForm />);
    rateAll();
    fireEvent.change(screen.getByLabelText("Additional comments (optional)"), { target: { value: "Useful priority step" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit feedback" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Feedback storage unavailable");
    expect(screen.queryByText(/Thank you for your feedback/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Additional comments (optional)")).toHaveValue("Useful priority step");
    expect(within(screen.getByRole("group", { name: "Overall usefulness" })).getByRole("button", { name: "4 out of 5" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Submit feedback" }));
    await screen.findByText(/Thank you for your feedback/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("surfaces network failures instead of silently discarding feedback", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network unavailable")));
    render(<TutorFeedbackForm />);
    rateAll();
    fireEvent.click(screen.getByRole("button", { name: "Submit feedback" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Network unavailable");
    expect(screen.getByRole("button", { name: "Submit feedback" })).toBeEnabled();
  });
});

it("does not present heuristic confidence as validated diagnostic accuracy", () => {
  render(<ConfidenceCard confidence="high" factors={[]} earlyExit={false} />);
  expect(screen.getByText(/not a validated probability of accuracy/)).toBeInTheDocument();
  expect(screen.getByText(/Confirm possible gaps with the student/)).toBeInTheDocument();
});
