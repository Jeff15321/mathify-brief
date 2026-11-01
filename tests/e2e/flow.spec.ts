import { expect, test } from "@playwright/test";

// The demo stores a singleton workspace, so these flows must not run concurrently.
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
  await page.getByTitle(/^Draw —/).click();
  const canvas = page.locator("canvas.excalidraw__canvas.interactive");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("whiteboard canvas not found");
  await page.mouse.move(box.x + 300, box.y + 280);
  await page.mouse.down();
  await page.mouse.move(box.x + 450, box.y + 380);
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeEnabled();

  await page.getByLabel("Expand Whiteboard").click();
  await page.getByLabel("Restore Whiteboard").click();
  await page.setViewportSize({ width: 800, height: 900 });
  await page.getByRole("button", { name: "Relevant Concepts", exact: true }).click();
  await page.getByRole("button", { name: "Whiteboard", exact: true }).click();
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeEnabled();
  await page.setViewportSize({ width: 1280, height: 720 });
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

  for (const label of ["Overall usefulness", "Breakdown accuracy", "Probe quality"]) {
    await page.getByRole("group", { name: label }).getByRole("button", { name: "4 out of 5" }).click();
  }
  const feedbackSaved = page.waitForResponse((response) =>
    response.url().endsWith("/api/feedback") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Submit feedback" }).click();
  expect((await feedbackSaved).status()).toBe(201);
  await expect(page.getByText(/Thank you for your feedback/)).toBeVisible();
});

test("blank scenes omit the snapshot; multiple uploaded images survive in the tutor PNG", async ({ page }) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith("http") && url.hostname !== "localhost") externalRequests.push(request.url());
  });
  await page.goto("/");
  await page.getByLabel("Question (optional if files provided)").fill("Solve x + 3 = 7.");
  await page.getByRole("button", { name: "Begin Session" }).click();
  await page.waitForURL("**/workspace");
  await expect(page.getByTitle(/^Draw —/)).toBeVisible();
  await page.getByRole("button", { name: "Fit to work" }).click();
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await page.waitForURL("**/brief");
  const blank = await (await page.request.get("/api/workspace")).json();
  expect(blank.workspace.whiteboardAsset).toBeNull();

  await page.goto("/");
  const images = await page.evaluate(() => ["#ff0000", "#0000ff"].map((color) => {
    const canvas = document.createElement("canvas");
    canvas.width = 120;
    canvas.height = 70;
    const context = canvas.getContext("2d")!;
    context.fillStyle = color;
    context.fillRect(0, 0, 120, 70);
    return canvas.toDataURL("image/png").split(",")[1];
  }));
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /Drag & drop images or PDFs/ }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(images.map((image, index) => ({
    name: `question-${index}.png`,
    mimeType: "image/png",
    buffer: Buffer.from(image, "base64"),
  })));
  await page.getByLabel("Question (optional if files provided)").fill("Solve x + 3 = 7.");
  await page.getByRole("button", { name: "Begin Session" }).click();
  await page.waitForURL("**/workspace");
  await expect(page.getByTitle(/^Draw —/)).toBeVisible();
  // Wait for the two image assets to be decoded and drawn, not just for the editor shell.
  await expect.poll(() => page.locator("canvas.excalidraw__canvas.static").evaluate((canvas: HTMLCanvasElement) => {
    const data = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
    let red = false;
    let blue = false;
    for (let index = 0; index < data.length; index += 4) {
      red ||= data[index] > 200 && data[index + 1] < 50 && data[index + 2] < 50;
      blue ||= data[index] < 50 && data[index + 1] < 50 && data[index + 2] > 200;
    }
    return red && blue;
  })).toBe(true);
  await page.getByTitle(/^Text —/).click();
  const board = await page.locator("canvas.excalidraw__canvas.interactive").boundingBox();
  if (!board) throw new Error("whiteboard canvas not found");
  await page.mouse.click(board.x + 300, board.y + 400);
  const textEditor = page.getByRole("textbox");
  await textEditor.fill("x + 3 = 7");
  await textEditor.press("Escape");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await page.waitForURL("**/brief");
  const preview = page.getByAltText("Student's whiteboard");
  await expect(preview).toBeVisible();
  await expect.poll(() => preview.evaluate((image: HTMLImageElement) => {
    if (!image.complete || !image.naturalWidth) return false;
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let red = false;
    let blue = false;
    for (let index = 0; index < data.length; index += 4) {
      red ||= data[index] > 200 && data[index + 1] < 50 && data[index + 2] < 50;
      blue ||= data[index] < 50 && data[index + 1] < 50 && data[index + 2] > 200;
    }
    return red && blue;
  })).toBe(true);
  expect(externalRequests).toEqual([]);
});
