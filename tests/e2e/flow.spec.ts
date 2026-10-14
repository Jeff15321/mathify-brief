import { expect, test } from "@playwright/test";

test("happy path: intake -> analysis -> workspace -> probes -> whiteboard -> submit -> brief", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Question (optional if files provided)").fill("Solve 2(x + 3) = 14.");
  await page.getByRole("button", { name: "Begin Session" }).click();

  await page.waitForURL("**/workspace");
  await expect(page.getByRole("heading", { name: "Probing questions" })).toBeVisible();

  // Answer two of the three mocked probes (q1 correct=B, q2 correct=C), leave q3 unanswered.
  await page.locator('input[name="q1"][value="B"]').check();
  await page.locator('input[name="q2"][value="C"]').check();
  await expect(page.getByText("2 of 3 answered")).toBeVisible();

  // Draw on the whiteboard with the pen tool.
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("whiteboard canvas not found");
  await page.mouse.move(box.x + 50, box.y + 50);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + 150);
  await page.mouse.up();

  // Expand the whiteboard panel, then restore it; drawing and answers must survive.
  await page.getByLabel("Expand Whiteboard").click();
  await page.getByLabel("Restore Whiteboard").click();
  await expect(page.getByText("2 of 3 answered")).toBeVisible();

  await page.getByRole("button", { name: "Submit" }).click();

  await page.waitForURL("**/brief");
  await expect(page.getByRole("heading", { name: "Tutor Brief" })).toBeVisible();
  await expect(page.getByText(/2 correct \/ 2 answered/)).toBeVisible();
  await expect(page.getByText(/1 unanswered/)).toBeVisible();
});
