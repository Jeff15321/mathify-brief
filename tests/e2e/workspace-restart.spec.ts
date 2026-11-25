import { expect, test } from '@playwright/test';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAKUlEQVR4nO3OIQEAAAACIP+f1hkWWEB6FgEBAQEBAQEBAQEBAQEBgXdgl/rw4unIZ5cAAAAASUVORK5CYII=', 'base64');

test('correcting the original problem starts a fresh draft before replacing saved work', async ({ page, request }) => {
  await page.goto('/workspace?new=1');
  await page.getByLabel('Question (optional if files provided)').fill('Old question: solve 2(x + 3) = 14.');
  await page.getByLabel('Problem photos or PDFs').setInputFiles({ name: 'old-source.png', mimeType: 'image/png', buffer: PNG });
  await page.getByRole('button', { name: 'Let’s begin' }).click();
  await expect(page.getByText('Question 1 of 3')).toBeVisible();
  await page.locator('input[name="s1-main"][value="B"]').check();

  await page.getByRole('link', { name: 'Problem needs a correction? Start a new one' }).click();
  await expect(page.getByLabel('Question (optional if files provided)')).toHaveValue('');
  await expect(page.getByAltText('Preview of old-source.png')).toHaveCount(0);
  const savedBeforeRestart = (await (await request.get('/api/workspace')).json()).workspace;
  expect(savedBeforeRestart.questionText).toBe('Old question: solve 2(x + 3) = 14.');
  expect(savedBeforeRestart.attachments).toHaveLength(1);

  await page.getByLabel('Question (optional if files provided)').fill('Corrected question: solve 4x = 12.');
  await page.getByRole('button', { name: 'Let’s begin' }).click();
  await expect(page.getByText('Question 1 of 3')).toBeVisible();
  await expect(page.locator('input[name^="s1-"]:checked')).toHaveCount(0);
  const replacement = (await (await request.get('/api/workspace')).json()).workspace;
  expect(replacement.questionText).toBe('Corrected question: solve 4x = 12.');
  expect(replacement.attachments).toHaveLength(0);
});
