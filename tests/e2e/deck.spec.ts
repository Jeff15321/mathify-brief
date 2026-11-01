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
  for (const slide of await page.locator(".slide").all()) {
    await expect(slide.locator(".slide-canvas")).toHaveCount(1);
    await expect(slide.locator(".slide-canvas")).toHaveAttribute("viewBox", "0 0 1600 900");
    expect(await slide.locator(".notes p").first().textContent()).not.toBe("");
  }
  for (const image of await page.locator(".slide-canvas image").all()) {
    const source = await image.getAttribute("href");
    expect(source).not.toBeNull();
    const response = await page.request.get(source!);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
  }
  for (let index = 1; index <= 12; index++) {
    await page.goto(`/stakeholder-deck.html#slide-${String(index).padStart(2, "0")}`);
    const layout = await page.locator(".slide:visible").evaluate(slide => {
      const canvas = slide.querySelector("svg")!;
      const script = slide.querySelector(".notes p")!;
      const bounds = canvas.getBoundingClientRect();
      const title = [...canvas.querySelectorAll("text")].find(text => text.getAttribute("y") === "150")!;
      return {
        leftAligned: title.getAttribute("x") === "72" && getComputedStyle(title).textAnchor === "start",
        landscape: Math.abs(bounds.width / bounds.height - 16 / 9) < 0.02,
        artworkFits: [...canvas.querySelectorAll("text")].every(text => {
          const box = text.getBBox();
          return box.x >= 0 && box.y >= 0 && box.x + box.width <= 1600 && box.y + box.height <= 900;
        }),
        noOverflow: slide.scrollWidth <= slide.clientWidth,
        scriptWords: (script.textContent ?? "").split(/\s+/).length,
      };
    });
    expect(layout.leftAligned).toBe(true);
    expect(layout.landscape).toBe(true);
    expect(layout.artworkFits).toBe(true);
    expect(layout.noOverflow).toBe(true);
    expect(layout.scriptWords).toBeGreaterThan(45);
  }
  await page.goto("/stakeholder-deck.html");
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
  for (let index = 1; index <= 12; index++) {
    await page.goto(`/stakeholder-deck.html#slide-${String(index).padStart(2, "0")}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator(".slide:visible .slide-canvas")).toBeVisible();
    expect(await page.locator(".slide:visible svg").evaluate(svg => {
      const { width, height } = svg.getBoundingClientRect();
      return Math.abs(width / height - 16 / 9) < 0.02;
    })).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".slide:visible")).toHaveCount(12);
  await expect(page.locator(".notes:visible")).toHaveCount(0);
  expect(external).toEqual([]);
});
