import { expect, test } from '@playwright/test';

test('core question-to-brief flow works in the configured browser engine', async ({ page }) => {
  await page.goto('/workspace?new=1');
  await page.getByLabel('Question (optional if files provided)').fill('Solve 2(x + 3) = 14.');
  await page.getByRole('button', { name: 'Let’s begin' }).click();
  await expect(page.getByText('Question 1 of 3')).toBeVisible();
  await page.getByRole('button', { name: 'Send to tutor' }).click();
  await expect(page.getByRole('heading', { name: 'Tutor Brief' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Original problem' })).toBeVisible();
});
