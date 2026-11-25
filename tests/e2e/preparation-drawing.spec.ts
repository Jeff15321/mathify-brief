import { expect, test } from '@playwright/test';

test('drawing remains available during delayed preparation and reaches the tutor brief', async ({ page }) => {
  await page.route('**/api/analyze', async route => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.goto('/workspace?new=1');
  await page.getByLabel('Question (optional if files provided)').fill('Solve 2(x + 3) = 14.');
  await page.getByRole('button', { name: 'Let’s begin' }).click();
  await expect(page.getByText('Preparing and checking your questions…')).toBeVisible();
  await expect(page.getByText('You can work on the whiteboard while you wait.')).toBeVisible();

  await page.getByRole('radio', { name: 'Draw', exact: true }).locator('..').click();
  const canvas = page.locator('canvas.excalidraw__canvas.interactive');
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Whiteboard canvas is not visible during preparation');
  await page.mouse.move(bounds.x + 80, bounds.y + 120);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 190, bounds.y + 190);
  await page.mouse.up();

  await expect(page.getByText('Question 1 of 3')).toBeVisible();
  await page.getByRole('button', { name: 'Send to tutor' }).click();
  await expect(page.getByRole('heading', { name: 'Tutor Brief' })).toBeVisible();
  await expect(page.getByAltText("Student's whiteboard")).toBeVisible();
});
