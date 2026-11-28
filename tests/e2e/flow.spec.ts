import { drawOnWhiteboard } from './whiteboard';
import { readDraftCheckpoint } from './draft-checkpoint';
import { expect, test } from "@playwright/test";

// Mock keys: s1-main B, s1-easier B, s2-main C, s2-easier B, s3-main B.
test("happy path: draw at intake and during practice, answer easier retries, then send the work to the tutor", async ({ page }) => {
  await page.goto("/workspace?new=1");

  const board = page.getByRole("region", { name: "Whiteboard", exact: true });
  await drawOnWhiteboard(page);
  const initialCanvas = await board.locator("canvas.excalidraw__canvas.interactive").elementHandle();
  await page.getByLabel("Question (optional if files provided)").fill("Solve 2(x + 3) = 14.");
  await page.getByRole("button", { name: "Let’s begin" }).click();

  await page.waitForURL(/\/workspace\?draft=/);
  await expect(page.getByRole("heading", { name: "Practice while you wait" })).toBeVisible();
  await expect(page.getByText("Question 1 of 3")).toBeVisible();

  expect(await initialCanvas?.evaluate(canvas => canvas.isConnected)).toBe(true);
  const left = await board.boundingBox();
  const right = await page.getByRole("region", { name: "Practice questions" }).boundingBox();
  if (!left || !right) throw new Error("Both practice panels should be visible");
  expect(Math.abs(left.width - right.width)).toBeLessThanOrEqual(1);
  expect(left.x + left.width).toBeCloseTo(right.x, 0);

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

  await page.locator('input[name="s2-easier"][value="B"]').check();
  await drawOnWhiteboard(page);
  await expect.poll(async () => (await readDraftCheckpoint(page))?.drawingCount).toBe(2);
  await page.reload();
  await expect(page.locator('input[name="s2-easier"][value="B"]')).toBeChecked();
  await expect(board.locator("canvas.excalidraw__canvas.interactive")).toBeVisible();
  await next.click();

  // Step 3 shows; submit early without answering it (skip-ahead via the DEMO button).
  await expect(page.getByText("Question 3 of 3")).toBeVisible();
  await page.getByRole("button", { name: "DEMO: connect to tutor" }).click();

  await expect(page.getByRole("heading", { name: "Tutor Brief" })).toBeVisible();
  await expect(page).toHaveURL(/\/workspace/);

  await page.screenshot({ path: "artifacts/pilot/tutor-desktop.png", fullPage: true });
  await page.getByText("Counts and additional concepts", { exact: true }).click();

  // Core practice questions: s1 incorrect, s2 not sure, s3 on screen (unanswered). Retries: both correct.
  const core = page.locator("section", { hasText: "Core practice questions" });
  await expect(core.getByText("0/2")).toBeVisible();
  await expect(core.getByText("2 of 3 attempted")).toBeVisible();
  await expect(core.getByText("1 incorrect · 1 not sure")).toBeVisible();
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

  // Practice question results start collapsed and expand to show every question asked.
  const retryItems = page.getByText("Easier retry", { exact: true });
  await expect(retryItems.first()).toBeHidden();
  await page.getByText("Practice question results").click();
  await expect(retryItems).toHaveCount(2);
  await expect(retryItems.first()).toBeVisible();
  await expect(page.getByText("Not reached before submitting")).toHaveCount(0);

  await expect(page.getByRole("region", { name: "Tutor feedback" })).toHaveCount(0);

  await page.getByRole("link", { name: "New question" }).click();
  await page.getByLabel("Question (optional if files provided)").fill("Solve 4x = 12.");
  await page.getByRole("button", { name: "Let’s begin" }).click();
  await page.waitForURL(/\/workspace\?draft=/);
  await expect(page.getByText("Question 1 of 3")).toBeVisible();
  // Answering every served question (including easier retries) auto-submits: no DEMO click.
  await page.locator('input[name="s1-main"][value="A"]').check();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Easier question")).toBeVisible();
  await page.locator('input[name="s1-easier"][value="A"]').check();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Question 2 of 3")).toBeVisible();
  await page.locator('input[name="s2-main"][value="A"]').check();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Easier question")).toBeVisible();
  await page.locator('input[name="s2-easier"][value="A"]').check();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Question 3 of 3")).toBeVisible();
  await page.locator('input[name="s3-main"][value="A"]').check();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Easier question")).toBeVisible();
  await page.locator('input[name="s3-easier"][value="A"]').check();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "Tutor Brief" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Tutor feedback" })).toHaveCount(0);
});
