import { expect, test } from "@playwright/test";

// Mock keys: s1-main B, s1-easier B, s2-main C, s2-easier B, s3-main B.
test("happy path: intake -> one-at-a-time probes with easier retries -> whiteboard -> brief -> tutor feedback", async ({ page, request }) => {
  await page.goto("/workspace?new=1");

  await page.getByLabel("Question (optional if files provided)").fill("Solve 2(x + 3) = 14.");
  await page.getByRole("button", { name: "Let’s begin" }).click();

  await page.waitForURL(/\/workspace\?draft=/);
  await expect(page.getByRole("heading", { name: "Relevant Concepts" })).toBeVisible();
  await expect(page.getByText("Question 1 of 3")).toBeVisible();

  const next = page.getByRole("button", { name: "Next" });

  // Step 1: wrong answer serves the easier question on the same concept.
  await page.locator('input[name="s1-main"][value="A"]').check();
  await next.click();
  await expect(page.getByText("Easier question")).toBeVisible();
  await page.locator('input[name="s1-easier"][value="B"]').check();
  await next.click();

  // Step 2 was buffered, so it appears without a loading state; "I don't know" also serves a retry.
  await expect(page.getByText("Question 2 of 3")).toBeVisible();
  await expect(page.getByText("Preparing your next question…")).toHaveCount(0);
  await page.locator('input[name="s2-main"][value="IDK"]').check();
  await next.click();
  await expect(page.getByText("Easier question")).toBeVisible();

  // Draw on the whiteboard, then expand/restore; the current selection must survive.
  await page.locator('input[name="s2-easier"][value="B"]').check();
  await page.getByRole("radio", { name: "Draw", exact: true }).locator("..").click();
  const canvas = page.locator("canvas.excalidraw__canvas.interactive");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("whiteboard canvas not found");
  await page.mouse.move(box.x + 50, box.y + 50);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + 150);
  await page.mouse.up();

  await expect(page.getByRole("status").filter({ hasText: "Saved on this device" })).toBeVisible();
  await page.reload();
  await expect(page.locator('input[name="s2-easier"][value="B"]')).toBeChecked();
  await page.getByLabel("Expand Whiteboard").click();
  await page.getByLabel("Restore Whiteboard").click();
  await expect(page.locator('input[name="s2-easier"][value="B"]')).toBeChecked();
  await next.click();

  // Step 3 shows; submit early without answering it.
  await expect(page.getByText("Question 3 of 3")).toBeVisible();
  await page.getByRole("button", { name: "Send to tutor" }).click();

  await page.waitForURL("**/brief");
  await expect(page.getByRole("heading", { name: "Tutor Brief" })).toBeVisible();

  // Core probes: s1 incorrect, s2 don't know, s3 on screen (unanswered). Retries: both correct.
  const core = page.locator("section", { hasText: "Core probes" });
  await expect(core.getByText("0/2")).toBeVisible();
  await expect(core.getByText("2 of 3 attempted")).toBeVisible();
  await expect(core.getByText("1 incorrect · 1 don't know")).toBeVisible();
  const retries = page.locator("section", { hasText: "Easier retries" });
  await expect(retries.getByText("2/2")).toBeVisible();

  // Both main questions were missed, so both are gaps even though their retries were correct.
  const gaps = page.locator("section", { hasText: "Possible gaps" });
  await expect(gaps.getByText("Distributive property")).toBeVisible();
  await expect(gaps.getByText("Inverse operations")).toBeVisible();
  await expect(page.locator("section", { hasText: "Observed strengths" }).getByText("None observed.")).toBeVisible();

  // Priority: the first missed main question, with the student's pick vs the key.
  const priority = page.locator("section", { hasText: "Key incorrect step" });
  await expect(priority.getByText("Distributive property")).toBeVisible();
  await expect(priority.getByText("Student selected · A")).toBeVisible();
  await expect(priority.getByText("Correct · B")).toBeVisible();
  await expect(priority.getByText(/Easier retry correct · 1\/2 correct for this concept/)).toBeVisible();

  await expect(page.getByAltText("Student's whiteboard")).toBeVisible();

  // Probing results start collapsed and expand to show every question asked.
  const retryItems = page.getByText("Easier retry", { exact: true });
  await expect(retryItems.first()).toBeHidden();
  await page.getByText("Probing results").click();
  await expect(retryItems).toHaveCount(2);
  await expect(retryItems.first()).toBeVisible();
  await expect(page.getByText("Not reached before submitting")).toHaveCount(0);

  // The survey sends the evaluated report identity and preserves the draft after an error.
  const snapshot = await (await request.get("/api/workspace")).json();
  const reportId = snapshot.workspace.feedbackReportId;
  const survey = page.getByRole("region", { name: "Tutor feedback" });
  await expect(survey.getByRole("radio")).toHaveCount(15);
  await expect(survey.locator("input:checked")).toHaveCount(0);
  // Native keyboard navigation changes only the focused radio group.
  await survey.getByRole("radio", { name: "2 — Inaccurate", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(survey.getByRole("radio", { name: "3 — Mixed", exact: true })).toBeChecked();
  await page.keyboard.press("ArrowRight");
  await expect(survey.getByRole("radio", { name: "4 — Accurate", exact: true })).toBeChecked();
  await expect(survey.getByRole("radio", { name: "4 — Accurate", exact: true })).toBeFocused();
  await expect(survey.getByRole("group", { name: "Clarity", exact: true }).locator("input:checked")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(survey.getByRole("radio", { name: "3 — Neither difficult nor easy", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("radio", { name: "4 — Accurate", exact: true }).check();
  await page.getByRole("radio", { name: "5 — Very easy", exact: true }).check();
  await page.getByRole("radio", { name: "3 — Somewhat useful", exact: true }).check();
  await page.getByRole("textbox", { name: /What was inaccurate, missing, or unnecessary/ }).fill("A little more context would help.");
  await page.route("**/api/feedback", async (route) => {
    await route.fulfill({ status: 500, json: { error: { message: "Could not save. Please try again." } } });
  }, { times: 1 });
  await page.getByRole("button", { name: "Save feedback", exact: true }).click();
  await expect(page.getByRole("region", { name: "Tutor feedback" }).getByRole("alert")).toHaveText(/Could not save/);
  await expect(page.getByRole("textbox", { name: /What was inaccurate, missing, or unnecessary/ })).toHaveValue("A little more context would help.");
  await page.getByRole("button", { name: "Save feedback", exact: true }).click();
  await expect(page.getByText(/your feedback is saved for this report/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/your feedback is saved for this report/)).toBeVisible();

  // Return to the desktop workspace controls after exercising the mobile survey.
  await page.setViewportSize({ width: 1280, height: 720 });
  // Start another question; the saved feedback is retained independently of the workspace.
  await page.getByRole("link", { name: "Start a new question" }).click();
  await page.getByLabel("Question (optional if files provided)").fill("Solve 4x = 12.");
  await page.getByRole("button", { name: "Let’s begin" }).click();
  await page.waitForURL(/\/workspace\?draft=/);
  await expect(page.getByText("Question 1 of 3")).toBeVisible();
  const saved = await (await request.get(`/api/feedback?reportId=${reportId}`)).json();
  expect(saved.feedback.reportId).toBe(reportId);
  await page.getByRole("button", { name: "Send to tutor", exact: true }).click();
  await page.waitForURL("**/brief");
  await expect(page.getByRole("button", { name: "Save feedback", exact: true })).toBeVisible();
  await page.getByRole("radio", { name: "4 — Accurate", exact: true }).check();
  await page.getByRole("radio", { name: "5 — Very easy", exact: true }).check();
  await page.getByRole("radio", { name: "3 — Somewhat useful", exact: true }).check();

  // Another tab replaces this report before the tutor submits the unsaved survey.
  expect((await request.post("/api/workspace/start", { multipart: { questionText: "A different question", draftId: crypto.randomUUID(), expectedWorkspaceId: (await (await request.get("/api/workspace")).json()).workspace.workspaceId } })).status()).toBe(201);
  await page.getByRole("button", { name: "Save feedback", exact: true }).click();
  await expect(page.getByRole("region", { name: "Tutor feedback" }).getByRole("alert")).toHaveText(/report has changed or been replaced/);
});
