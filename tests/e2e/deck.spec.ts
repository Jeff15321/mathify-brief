import { expect, test } from "@playwright/test";

test("static evidence deck supports navigation, notes, mobile, and complete printing", async ({ page }) => {
  const external: string[] = [];
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.protocol.startsWith("http") && url.hostname !== "localhost") external.push(request.url());
  });
  await page.goto("/stakeholder-deck.html");
  await expect(page.locator(".slide")).toHaveCount(12);
  await expect(page.locator(".slide:visible")).toHaveCount(1);
  await expect(page.getByText("Slide 1 of 12", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Previous", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/#slide-02$/);
  await page.keyboard.press("End");
  await expect(page.getByText("Slide 12 of 12", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await page.keyboard.press("Home");
  await page.keyboard.press("n");
  await expect(page.getByRole("button", { name: "Speaker notes" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#slide-01 .notes")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".slide:visible")).toHaveCount(12);
  await expect(page.locator(".notes:visible")).toHaveCount(0);
  expect(external).toEqual([]);
});
