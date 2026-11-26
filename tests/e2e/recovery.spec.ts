import { expect, test, type Page } from '@playwright/test';
async function start(page: Page) {
  await page.goto('/workspace?new=1');
  await page.getByLabel('Your question').fill('Solve 2(x + 3) = 14.');
  await page.getByRole('button', { name: 'Start warm-up' }).click();
  await expect(page.getByText('Question 1 of 3')).toBeVisible();
  // Once probing starts the whiteboard lives behind a full-screen overlay; verify the board is
  // ready inside it, then close it so the probing screen is showing again.
  await page.getByRole('button', { name: 'Open whiteboard' }).click();
  // Let the slide-in drawer finish its transform before reading the toolbar.
  await page.waitForTimeout(250);
  await expect(page.getByRole('button', { name: 'Fit to work' })).toBeEnabled();
  await page.getByRole('button', { name: 'Close whiteboard' }).click();
}
test('failed drawing export can be omitted explicitly without losing the selected answer', async ({ page, request }) => {
  await page.addInitScript(() => { HTMLCanvasElement.prototype.toBlob = function(callback) { callback(null); }; });
  await start(page);
  await page.getByRole('button', { name: 'Open whiteboard' }).click();
  // Let the slide-in drawer finish its transform before reading canvas coordinates.
  await page.waitForTimeout(250);
  await page.getByRole('radio', { name: 'Draw', exact: true }).locator('..').click();
  const bounds = await page.locator('canvas.excalidraw__canvas.interactive').boundingBox();
  if (!bounds) throw new Error('Board not visible');
  // Start mid-canvas: Excalidraw floats its menu and color picker over the edges.
  await page.mouse.move(bounds.x + bounds.width / 2 - 60, bounds.y + bounds.height / 2); await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 60, bounds.y + bounds.height / 2 + 80); await page.mouse.up();
  await page.getByRole('button', { name: 'Close whiteboard' }).click();
  await page.locator('input[name="s1-main"][value="B"]').check();
  await page.getByRole('button', { name: 'Create tutor brief' }).click();
  await expect(page.getByRole('button', { name: 'Send without drawing' })).toBeVisible();
  await page.getByRole('button', { name: 'Send without drawing' }).click();
  await expect(page.getByRole('heading', { name: 'Tutor Brief' })).toBeVisible();
  await expect(page.getByText(/drawing export was omitted/)).toBeVisible();
  const { workspace } = await (await request.get('/api/workspace')).json();
  expect(workspace.brief.results[0].selectedOptionId).toBe('B');
  expect(workspace.whiteboardState).toBe('omitted');
});
test('fetch retry preserves a saved intake draft', async ({ page }) => {
  await page.goto('/workspace?new=1');
  await page.getByLabel('Your question').fill('A saved question');
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('mathify-pilot-events-v1') ?? '[]').some((event: { eventName: string }) => event.eventName === 'draft_saved'))).toBe(true);
  await page.route('**/api/workspace', route => route.fulfill({ status: 503, json: { error: { message: 'Temporary connection failure' } } }), { times: 1 });
  await page.reload();
  await expect(page.getByText('Temporary connection failure')).toBeVisible();
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByLabel('Your question')).toHaveValue('A saved question');
});
test('PDF-only intake keeps its original source available to the tutor', async ({ page }) => {
  await page.goto('/workspace?new=1');
  await page.getByLabel('Problem photos or PDFs').setInputFiles('tests/fixtures/probe-evaluation/sources/normal-03-1.pdf');
  await page.getByRole('button', { name: 'Start warm-up' }).click();
  await expect(page.getByText('Question 1 of 3')).toBeVisible();
  await page.getByRole('button', { name: 'Open whiteboard' }).click();
  await page.waitForTimeout(250);
  await expect(page.getByRole('button', { name: 'Fit to work' })).toBeEnabled();
  await page.getByRole('button', { name: 'Close whiteboard' }).click();
  await page.getByRole('button', { name: 'Create tutor brief' }).click();
  await expect(page.getByRole('heading', { name: 'Tutor Brief' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'normal-03-1.pdf (PDF)' })).toBeVisible();
});
test('quota failure is visible and never claims the draft was saved', async ({ page }) => {
  await page.addInitScript(() => { IDBFactory.prototype.open = () => { throw new DOMException('Storage unavailable', 'QuotaExceededError'); }; });
  await page.goto('/workspace?new=1');
  await page.getByLabel('Your question').fill('Keep this question open');
  await expect(page.getByText(/This device could not save your draft/)).toBeVisible();
  await expect(page.getByText('Saved on this device', { exact: true })).toHaveCount(0);
});
test('lost Next response cannot carry an old answer into the next hinted question', async ({ page }) => {
  await start(page);
  await page.locator('input[name="s1-main"][value="B"]').check();
  await page.route('**/api/probes/answer', async route => { await route.fetch(); await route.fulfill({ status: 503, json: { error: { message: 'Response lost' } } }); }, { times: 1 });
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Question 2 of 3')).toBeVisible();
  await page.getByRole('button', { name: 'Show a hint' }).click();
  await expect(page.locator('input[name="s2-main"]:checked')).toHaveCount(0);
});
test('pilot events distinguish ready, visible and acknowledged answers without content', async ({ page }) => {
  await start(page);
  await page.locator('input[name="s1-main"][value="IDK"]').check();
  await page.getByRole('button', { name: 'Create tutor brief' }).click();
  await expect(page.getByRole('heading', { name: 'Tutor Brief' })).toBeVisible();
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('mathify-pilot-events-v1') ?? '[]').map((e: { eventName: string }) => e.eventName))).toContain('brief_visible');
  const events = await page.evaluate(() => JSON.parse(localStorage.getItem('mathify-pilot-events-v1') ?? '[]'));
  for (const name of ['begin_clicked', 'upload_succeeded', 'analysis_ready', 'probe_ready', 'probe_visible', 'answer_saved', 'brief_saved']) expect(events.some((e: { eventName: string }) => e.eventName === name)).toBe(true);
  expect(JSON.stringify(events)).not.toContain('Solve 2');
  expect(JSON.stringify(events)).not.toContain('selectedOption');
  expect(new Set(events.map((e: { attemptId: string }) => e.attemptId)).size).toBe(1);
});
