import { expect, test } from '@playwright/test';

test('tutor brief disclosures open and close with the keyboard', async ({ page }) => {
  await page.goto('/workspace?new=1');
  await page.getByLabel('Your question').fill('Solve 2(x + 3) = 14.');
  await page.getByRole('button', { name: 'Start warm-up' }).click();
  await expect(page.getByText('Question 1 of 3')).toBeVisible();
  await page.getByRole('button', { name: 'Create tutor brief' }).click();
  await expect(page.getByRole('heading', { name: 'Tutor Brief' })).toBeVisible();

  const counts = page.locator('summary').filter({ hasText: 'Counts and additional concepts' });
  await counts.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(counts).toBeFocused();
  expect(await counts.evaluate(element => getComputedStyle(element).boxShadow)).not.toBe('none');
  await counts.press('Enter');
  await expect(counts.locator('xpath=..')).toHaveAttribute('open', '');
  await counts.press('Space');
  await expect(counts.locator('xpath=..')).not.toHaveAttribute('open', '');

  const results = page.locator('summary').filter({ hasText: 'Probing results' });
  await results.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  expect(await results.evaluate(element => getComputedStyle(element).boxShadow)).not.toBe('none');
  await results.press('Space');
  await expect(results.locator('xpath=..')).toHaveAttribute('open', '');
});
