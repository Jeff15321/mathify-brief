import { expect, test } from "@playwright/test";

// The MVP has one stored workspace, so browser journeys must not overlap.
test.describe.configure({ mode: "serial" });

// Mock keys: s1-main B, s1-easier B, s2-main C, s2-easier B, s3-main B.
test("happy path: intake -> one-at-a-time probes with easier retries -> whiteboard -> brief", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Question (optional if files provided)").fill("Solve 2(x + 3) = 14.");
  await page.getByRole("button", { name: "Begin Session" }).click();

  await page.waitForURL("**/workspace");
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
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("whiteboard canvas not found");
  await page.mouse.move(box.x + 50, box.y + 50);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + 150);
  await page.mouse.up();

  // Regression: the whole dotted area must be drawable, including its top-left corner.
  const area = await canvas.locator("xpath=..").boundingBox();
  if (!area) throw new Error("whiteboard area not found");
  await page.mouse.move(area.x + 15, area.y + 15);
  await page.mouse.down();
  await page.mouse.move(area.x + 40, area.y + 18);
  await page.mouse.up();
  const cornerHasInk = await canvas.evaluate((el: HTMLCanvasElement) => {
    const ratio = el.width / el.getBoundingClientRect().width;
    const { data } = el.getContext("2d")!.getImageData(10 * ratio, 10 * ratio, 35 * ratio, 15 * ratio);
    return data.some((value, i) => i % 4 === 3 && value !== 0);
  });
  expect(cornerHasInk).toBe(true);
  await page.getByLabel("Expand Whiteboard").click();
  await page.getByLabel("Restore Whiteboard").click();
  await expect(page.locator('input[name="s2-easier"][value="B"]')).toBeChecked();
  await next.click();

  // Step 3 shows; submit early without answering it.
  await expect(page.getByText("Question 3 of 3")).toBeVisible();
  await page.getByRole("button", { name: "Submit" }).click();

  await page.waitForURL("**/brief");
  await expect(page.getByRole("heading", { name: "Linear equations" })).toBeVisible();

  await page.screenshot({ path: test.info().outputPath("brief-desktop.png"), fullPage: true });

  // Categories preserve A–Z concept order, and each entire row toggles its own evidence.
  const summary = page.getByRole("region", { name: "Response summary" });
  await expect(summary.getByRole("heading", { level: 2 })).toHaveText(["Correct on simpler question", "Unanswered"]);
  await expect(summary.locator("details[id] > summary h3")).toHaveText(["Distributive property", "Inverse operations", "Solving for x"]);
  const distributionSummary = page.locator("#probe-step-0 > summary");
  await expect(distributionSummary).toContainText(/Incorrect.*Correct/);
  await expect(page.locator("#probe-step-1 > summary")).toContainText(/Unsure.*Correct/);
  await expect(page.locator("#probe-step-2 > summary")).toContainText("Unanswered");
  const mainEvidence = page.getByRole("region", { name: "Main question: Distributive property" });
  await expect(mainEvidence.getByText("Student answer")).toBeHidden();
  await distributionSummary.focus();
  await page.keyboard.press("Enter");
  await expect(mainEvidence.getByText("Student answer")).toBeVisible();
  await expect(mainEvidence.getByText("Question", { exact: true })).toBeVisible();
  await expect(mainEvidence.getByText(/Answer key|Answer rationale|Student answer ·/)).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Simpler question: Distributive property" })).toBeVisible();
  await expect(page.locator("#probe-step-1")).not.toHaveAttribute("open", "");
  // Clicking the outcome portion of the row also toggles the same native disclosure.
  await distributionSummary.getByText(/Correct$/).click();
  await expect(mainEvidence.getByText("Student answer")).toBeHidden();
  await distributionSummary.click();
  await expect(mainEvidence).toBeVisible();
  await page.locator("#probe-step-2 > summary").focus();
  await page.keyboard.press("Enter");
  await expect(mainEvidence).toBeHidden();
  await expect(page.locator("#probe-step-0")).not.toHaveAttribute("open", "");
  await expect(page.getByText("No answer submitted", { exact: true })).toBeVisible();
  await page.locator("#probe-step-2 > summary").click();

  await expect(page.getByRole("region", { name: "Problem text" })).toBeHidden();
  await expect(page.getByAltText("Student's whiteboard")).toBeHidden();
  const workToggle = page.getByText("Original problem & student work", { exact: true });
  await workToggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: "Problem text" })).toContainText("Solve 2(x + 3) = 14.");
  await expect(page.getByAltText("Student's whiteboard")).toBeVisible();
  await expect(page.getByRole("link", { name: "Student's whiteboard · open original" })).toBeVisible();
  await workToggle.click();

  const detailsToggle = page.getByText("Report details", { exact: true });
  await expect(page.getByText(/AI-estimated question level/)).toBeHidden();
  await detailsToggle.click();
  await expect(page.getByText("0 correct · 1 incorrect · 1 unsure · 1 unattempted (2 of 3 attempted)")).toBeVisible();
  await expect(page.getByText(/AI-estimated question level/)).toBeVisible();
  await expect(page.getByText("No answer submitted", { exact: true })).toBeHidden();
  await detailsToggle.click();

  await page.getByRole("link", { name: "Start a new question" }).click();
  await expect(page.getByRole("button", { name: "Begin Session" })).toBeVisible();

});

// Brief disclosures remain usable on a narrow screen, with no document overflow.
test("mobile brief: no answers shows missing evidence and accessible details", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByLabel("Question (optional if files provided)").fill("Solve 2(x + 3) = 14.");
  await page.getByRole("button", { name: "Begin Session" }).click();
  await page.waitForURL("**/workspace");
  await page.getByRole("button", { name: "Relevant Concepts", exact: true }).click();
  await page.getByRole("button", { name: "Submit" }).click();
  await page.waitForURL("**/brief");
  await expect(page.getByText(/0 of 3 main questions answered/)).toBeVisible();
  const summary = page.getByRole("region", { name: "Response summary" });
  await expect(summary.getByRole("heading", { name: "Unanswered", exact: true })).toBeVisible();
  await expect(summary.getByRole("listitem").filter({ hasText: "Not reached" })).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("brief-mobile.png"), fullPage: true });
  await expect(page.getByText("No answer submitted", { exact: true })).toBeHidden();
  await page.locator("#probe-step-0 > summary").click();
  await expect(page.getByText("No answer submitted", { exact: true })).toBeVisible();
  await page.locator("#not-reached-0 > summary").click();
  await expect(page.locator("#probe-step-0")).not.toHaveAttribute("open", "");
  await expect(page.locator("#not-reached-0").getByText("Not reached before submitting. No question or answer recorded.")).toBeVisible();
});

// Uploaded originals remain accessible without nested parsed/original tabs.
test("mobile image-only problem and long original text remain accessible", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByLabel("Upload files").setInputFiles({
    name: "question.png", mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7xkAAAAASUVORK5CYII=", "base64"),
  });
  await page.getByRole("button", { name: "Begin Session" }).click();
  await page.waitForURL("**/workspace");
  await page.getByRole("button", { name: "Relevant Concepts", exact: true }).click();
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await page.waitForURL("**/brief");
  await page.getByText("Original problem & student work", { exact: true }).click();
  await expect(page.getByText("Problem · transcribed from upload")).toBeVisible();
  const image = page.getByAltText("question.png");
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  await expect(page.getByRole("link", { name: "question.png · open original" })).toBeVisible();

  await page.getByRole("link", { name: "Start a new question" }).click();
  const longProblem = "Explain $x + y$. ".repeat(80) + "END OF ORIGINAL";
  await page.getByLabel("Question (optional if files provided)").fill(longProblem);
  await page.getByRole("button", { name: "Begin Session" }).click();
  await page.waitForURL("**/workspace");
  await page.getByRole("button", { name: "Relevant Concepts", exact: true }).click();
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await page.waitForURL("**/brief");
  await page.getByText("Original problem & student work", { exact: true }).click();
  const problem = page.getByRole("region", { name: "Problem text" });
  await expect(problem).toContainText("END OF ORIGINAL");
  await problem.focus();
  await page.keyboard.press("End");
  await expect.poll(() => problem.evaluate((el) => el.scrollTop > 0)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole("heading", { name: "Linear equations" })).toBeVisible();
});

// A read-only mocked response exercises long answer comparisons at phone width.
test("mobile evidence wraps long textual answer choices", async ({ page, request }) => {
  const snapshot = await (await request.get("/api/workspace")).json();
  const result = snapshot.workspace.brief.results[0];
  result.outcome = "incorrect";
  result.selectedOptionId = "A";
  result.correctOptionId = "B";
  result.selectedOptionText = "The same operation applies only to the first term. ".repeat(4) + "LongUnbrokenChoice".repeat(8);
  result.correctOptionText = "The operation applies to every term inside the parentheses. ".repeat(4);
  await page.route("**/api/workspace", (route) => route.fulfill({ json: snapshot }));
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/brief");
  const mainEvidence = page.getByRole("region", { name: `Main question: ${result.concept}` });
  const choice = mainEvidence.getByText(result.selectedOptionText, { exact: true });
  await expect(choice).toBeHidden();
  await page.locator(`#probe-step-${result.stepIndex} > summary`).click();
  await expect(choice).toBeVisible();
  await expect(mainEvidence.getByText(result.correctOptionText, { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await choice.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("brief-mobile-long-answers.png"), fullPage: true });
});
