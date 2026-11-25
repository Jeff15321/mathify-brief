import { expect, test } from '@playwright/test';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAKUlEQVR4nO3OIQEAAAACIP+f1hkWWEB6FgEBAQEBAQEBAQEBAQEBgXdgl/rw4unIZ5cAAAAASUVORK5CYII=', 'base64');
const photo = (name: string) => ({ name, mimeType: 'image/png', buffer: PNG });
test('batch upload stays in one workspace, persists selection and sends it without Next', async ({ page, request }) => {
  await page.goto('/workspace?new=1');
  await expect(page.getByText(/A few short checks help your tutor/)).toBeVisible();
  await page.getByLabel('Problem photos or PDFs').setInputFiles([photo('page-1.png'), photo('page-2.png')]);
  await expect(page.getByAltText('Preview of page-1.png')).toBeVisible();
  await expect(page.getByAltText('Preview of page-2.png')).toBeVisible();
  await expect(page.getByText(/same file appears more than once/)).toBeVisible();
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('mathify-pilot-events-v1') ?? '[]').filter((event: { eventName: string }) => event.eventName === 'draft_saved').length)).toBeGreaterThan(0);
  await page.reload();
  await expect(page.getByAltText('Preview of page-2.png')).toBeVisible();
  await page.getByRole('button', { name: 'Let’s begin' }).click();
  await expect(page.getByText('Question 1 of 3')).toBeVisible();
  const savedBeforeReload = await page.evaluate(() => JSON.parse(localStorage.getItem('mathify-pilot-events-v1') ?? '[]').filter((event: { eventName: string }) => event.eventName === 'draft_saved').length);
  await page.locator('input[name="s1-main"][value="B"]').check();
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('mathify-pilot-events-v1') ?? '[]').filter((event: { eventName: string }) => event.eventName === 'draft_saved').length)).toBeGreaterThan(savedBeforeReload);
  await page.reload();
  await expect(page.locator('input[name="s1-main"][value="B"]')).toBeChecked();
  await page.screenshot({ path: 'artifacts/pilot/student-desktop.png' });
  await expect(page.getByText('Loading uploaded images…')).toHaveCount(0);
  await page.getByRole('button', { name: 'DEMO: connect to tutor' }).click();
  await expect(page.getByRole('heading', { name: 'Tutor Brief' })).toBeVisible();
  const { workspace } = await (await request.get('/api/workspace')).json();
  expect(workspace.attachments).toHaveLength(2);
  expect(workspace.brief.core.attempted).toBe(1);
  expect(workspace.brief.results[0].selectedOptionId).toBe('B');
  expect(workspace.brief.retries.total).toBe(0);
});
test('phone checks start visible and a selected answer survives a drawing tab switch', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/workspace?new=1');
  await page.getByLabel('Question (optional if files provided)').fill('Solve 2(x + 3) = 14.');
  await page.getByRole('button', { name: 'Let’s begin' }).click();
  await expect(page.getByText('Question 1 of 3')).toBeVisible();
  await page.locator('input[name="s1-main"][value="IDK"]').check();
  await page.getByRole('button', { name: 'Show a hint' }).click();
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('mathify-pilot-events-v1') ?? '[]').some((event: { eventName: string }) => event.eventName === 'draft_saved'))).toBe(true);
  await page.reload();
  await expect(page.getByText('Hint:', { exact: true })).toBeVisible();
  // Once probing starts the whiteboard is a slide-in drawer on the left.
  await page.getByRole('button', { name: 'Open whiteboard' }).click();
  await expect(page.getByRole('button', { name: 'Close whiteboard' })).toBeVisible();
  await page.getByRole('button', { name: 'Close whiteboard' }).click();
  await expect(page.locator('input[name="s1-main"][value="IDK"]')).toBeChecked();
  // The closed drawer must sit entirely off-screen: no strip may peek past the viewport edge.
  // Poll so the 200ms slide transition can finish first.
  await expect.poll(async () => page.evaluate(() => {
    const el = document.querySelector('section[aria-hidden="true"]');
    return el ? el.getBoundingClientRect().right : -1;
  }), { timeout: 2000 }).toBeLessThanOrEqual(0.5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'DEMO: connect to tutor' }).click();
  await expect(page.getByRole('heading', { name: 'Tutor Brief' })).toBeVisible();
  expect((await (await request.get('/api/workspace')).json()).workspace.brief.results[0].hintOpened).toBe(true);
});
test('a sixth file is rejected explicitly while existing files remain', async ({ page }) => {
  await page.goto('/workspace?new=1');
  await page.getByLabel('Problem photos or PDFs').setInputFiles([photo('kept.png')]);
  await expect(page.getByAltText('Preview of kept.png')).toBeVisible();
  await page.getByLabel('Problem photos or PDFs').setInputFiles(Array.from({ length: 5 }, (_, n) => photo(`${n}.png`)));
  await expect(page.getByRole('alert').filter({ hasText: 'up to 5 files' })).toBeVisible();
  await expect(page.getByAltText('Preview of kept.png')).toBeVisible();
  await expect(page.getByAltText('Preview of 0.png')).toHaveCount(0);
});
