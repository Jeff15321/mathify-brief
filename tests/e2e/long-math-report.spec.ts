import { expect, test } from '@playwright/test';

test('long mathematical problem remains readable on desktop and phone', async ({ page }) => {
  const terms = Array.from({ length: 70 }, (_, index) => `x_{${index + 1}}`).join(' + ');
  const question = `Simplify $${terms}$. Final instruction: preserve every term. LONG_MATH_END.`;
  await page.goto('/workspace?new=1');
  await page.getByLabel('Question (optional if files provided)').fill(question);
  await page.getByRole('button', { name: 'Let’s begin' }).click();
  await expect(page.getByText('Question 1 of 3')).toBeVisible();
  await page.getByRole('button', { name: 'DEMO: connect to tutor' }).click();
  await expect(page.getByRole('heading', { name: 'Tutor Brief' })).toBeVisible();

  const originalProblem = page.getByRole('region', { name: 'Original problem' });
  await expect(originalProblem).toBeVisible();
  await expect(page.getByText('LONG_MATH_END.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText('LONG_MATH_END.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
