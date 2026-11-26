import { expect, test } from '@playwright/test';

test('preparation and rejected-file feedback use accessible live regions', async ({ page }) => {
  await page.goto('/workspace?new=1');
  await page.getByLabel('Problem photos or PDFs').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not an accepted source'),
  });
  await expect(page.getByRole('alert').filter({ hasText: 'Use PNG, JPEG, WebP or PDF.' })).toBeVisible();

  await page.route('**/api/analyze', async route => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await route.continue();
  });
  await page.getByLabel('Your question').fill('Solve 2(x + 3) = 14.');
  await page.getByRole('button', { name: 'Start warm-up' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Preparing and checking your questions…' })).toBeVisible();
});
