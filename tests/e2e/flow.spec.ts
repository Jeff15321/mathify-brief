import { expect, test } from "@playwright/test";

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
});
