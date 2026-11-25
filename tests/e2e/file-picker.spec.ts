import { expect, test } from '@playwright/test';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAKUlEQVR4nO3OIQEAAAACIP+f1hkWWEB6FgEBAQEBAQEBAQEBAQEBgXdgl/rw4unIZ5cAAAAASUVORK5CYII=', 'base64');
const photo = (name: string) => ({ name, mimeType: 'image/png', buffer: PNG });

test('cancel keeps the selection and removing a file allows selecting it again', async ({ page }) => {
  await page.goto('/workspace?new=1');
  const input = page.getByLabel('Problem photos or PDFs');
  await input.setInputFiles(photo('same-photo.png'));
  await expect(page.getByAltText('Preview of same-photo.png')).toBeVisible();

  await input.dispatchEvent('cancel');
  await expect(page.getByAltText('Preview of same-photo.png')).toBeVisible();

  await page.getByRole('button', { name: 'Remove same-photo.png' }).click();
  await expect(page.getByAltText('Preview of same-photo.png')).toHaveCount(0);
  await input.setInputFiles(photo('same-photo.png'));
  await expect(page.getByAltText('Preview of same-photo.png')).toBeVisible();
  await expect(page.getByText('1 file chosen', { exact: true })).toBeVisible();
});
