import { readDraftCheckpoint } from './draft-checkpoint';
import { expect, test } from "@playwright/test";

// Mock keys: s1-main B, s1-easier B, s2-main C, s2-easier B, s3-main B.
test("happy path: intake -> one-at-a-time probes with easier retries -> whiteboard -> brief", async ({ page }) => {
  await page.goto("/workspace?new=1");

  await page.getByLabel("Your question").fill("Solve 2(x + 3) = 14.");
  await page.getByRole("button", { name: "Start warm-up" }).click();

  await page.waitForURL(/\/workspace\?draft=/);
  await expect(page.getByRole("heading", { name: "Your warm-up" })).toBeVisible();
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

  // Draw on the whiteboard via the full-screen overlay; the current selection must survive.
  await page.locator('input[name="s2-easier"][value="B"]').check();
  await page.getByRole("button", { name: "Open whiteboard" }).click();
  // Let the slide-in drawer finish its transform before reading canvas coordinates.
  await page.waitForTimeout(250);
  await page.getByRole("radio", { name: "Draw", exact: true }).locator("..").click();
  const canvas = page.locator("canvas.excalidraw__canvas.interactive");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("whiteboard canvas not found");
  // Start mid-canvas: the top-left corner hosts Excalidraw's main-menu button.
  await page.mouse.move(box.x + box.width / 2 - 60, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 80);
  await page.mouse.up();

  await expect.poll(async () => (await readDraftCheckpoint(page))?.hasDrawing).toBe(true);
  await page.reload();
  await expect(page.locator('input[name="s2-easier"][value="B"]')).toBeChecked();
  await page.getByRole("button", { name: "Open whiteboard" }).click();
  await page.getByRole("button", { name: "Close whiteboard" }).click();
  await expect(page.locator('input[name="s2-easier"][value="B"]')).toBeChecked();
  await expect(page.getByRole('dialog', { name: 'Whiteboard' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Open whiteboard' })).toBeFocused();
  await next.click();

  // Step 3 shows; submit early without answering it (skip-ahead via the DEMO button).
  await expect(page.getByText("Question 3 of 3")).toBeVisible();
  await page.getByRole("button", { name: "Create tutor brief" }).click();

  await expect(page.getByRole("heading", { name: "Tutor Brief" })).toBeVisible();
  await expect(page).toHaveURL(/\/workspace/);

  await page.screenshot({ path: "artifacts/pilot/tutor-desktop.png", fullPage: true });
  await page.getByText("Counts and additional concepts", { exact: true }).click();

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

  await expect(page.getByRole("region", { name: "Tutor feedback" })).toHaveCount(0);

  await page.getByRole("link", { name: "New question" }).click();
  await page.getByLabel("Your question").fill("Solve 4x = 12.");
  await page.getByRole("button", { name: "Start warm-up" }).click();
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
