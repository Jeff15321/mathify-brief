import { expect, test } from '@playwright/test';

test('core question-to-brief flow works in the configured browser engine', async ({ page }) => {
  await page.goto('/workspace?new=1');
  await page.getByLabel('Your question').fill('Solve 2(x + 3) = 14.');
  await page.getByRole('button', { name: 'Start warm-up' }).click();
  await expect(page.getByText('Question 1 of 3')).toBeVisible();
  await page.getByRole('button', { name: 'Create tutor brief' }).click();
  await expect(page.getByRole('heading', { name: 'Tutor Brief' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Original problem' })).toBeVisible();
});
