import { expect, test } from "@playwright/test";

// The MVP has one stored workspace, so browser journeys must not overlap.
test.describe.configure({ mode: "serial" });

// Mock keys: s1-main B, s1-easier B, s2-main C, s2-easier B, s3-main B.
test("happy path: intake -> one-at-a-time probes with easier retries -> whiteboard -> early submit -> brief", async ({ page }) => {
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
  await expect(page.getByRole("heading", { name: "Tutor Brief" })).toBeVisible();

  await page.screenshot({ path: test.info().outputPath("brief-desktop.png"), fullPage: true });

  // Core probes: s1 incorrect, s2 don't know, s3 on screen (unanswered). Retries: both correct.
  const core = page.locator("dl > div", { hasText: "Core probes" });
  await expect(core.getByText("0/2 correct")).toBeVisible();
  await expect(core.getByText("2 of 3 attempted")).toBeVisible();
  await expect(core.getByText("1 incorrect · 1 don't know · 1 unattempted")).toBeVisible();
  const retries = page.locator("dl > div", { hasText: "Easier retries" });
  await expect(retries.getByText("2/2 correct")).toBeVisible();

  // Both main questions were missed, so both are gaps even though their retries were correct.
  const gaps = page.locator("section", { hasText: "Possible gaps" });
  await expect(gaps.getByText("Distributive property")).toBeVisible();
  await expect(gaps.getByText("Inverse operations")).toBeVisible();
  await expect(page.locator("section", { hasText: "Observed strengths" }).getByText("None observed.")).toBeVisible();

  // Priority: the first missed main question, with the student's pick vs the key.
  const priority = page.locator("section", { hasText: "Start here" });
  await expect(priority.getByText("Review Distributive property")).toBeVisible();
  await expect(priority.getByText("Student selected · A")).toBeHidden();
  await priority.getByText("View priority question and answer").click();
  await expect(priority.getByText("Student selected · A")).toBeVisible();
  await expect(priority.getByText("Correct · B")).toBeVisible();
  await expect(priority.getByText(/Easier retry correct/)).toBeVisible();

  await expect(page.getByAltText("Student's whiteboard")).toBeHidden();
  await page.locator("summary").filter({ hasText: "Question & student work" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByAltText("Student's whiteboard")).toBeVisible();
  await page.getByRole("button", { name: "View full question" }).click();
  await expect(page.getByRole("button", { name: "Hide full question" })).toBeVisible();

  // Probing results start collapsed and expand to show every question asked.
  const retryItems = page.getByText("Easier retry", { exact: true });
  await expect(retryItems.first()).toBeHidden();
  await page.getByText("Probing results").click();
  await expect(retryItems).toHaveCount(2);
  await expect(retryItems.first()).toBeVisible();
  await expect(page.getByText("Not reached before submitting")).toHaveCount(0);
});

// Brief disclosures remain usable on a narrow screen, with no document overflow.
test("mobile brief: no answers gives an honest starting point and accessible details", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByLabel("Question (optional if files provided)").fill("Solve 2(x + 3) = 14.");
  await page.getByRole("button", { name: "Begin Session" }).click();
  await page.waitForURL("**/workspace");
  await page.getByRole("button", { name: "Relevant Concepts", exact: true }).click();
  await page.getByRole("button", { name: "Submit" }).click();
  await page.waitForURL("**/brief");
  await expect(page.getByText(/Not enough evidence yet/)).toBeVisible();
  await expect(page.getByText("0 incorrect · 0 don't know · 3 unattempted")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("brief-mobile.png"), fullPage: true });
  await page.getByText("Probing results", { exact: true }).click();
  await expect(page.getByText("Selected: Unanswered", { exact: true })).toBeVisible();
  await expect(page.getByText(/Not reached before submitting:/)).toBeVisible();
});
