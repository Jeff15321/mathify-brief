import { expect, type Page } from '@playwright/test';

export async function drawOnWhiteboard(page: Page) {
  const board = page.getByRole('region', { name: 'Whiteboard', exact: true });
  await board.getByRole('radio', { name: 'Draw', exact: true }).locator('..').click();
  const canvas = board.locator('canvas.excalidraw__canvas.interactive');
  await expect(canvas).toBeVisible();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Whiteboard canvas is missing');
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  await page.mouse.move(x - 40, y);
  await page.mouse.down();
  await page.mouse.move(x + 40, y + 50, { steps: 6 });
  await page.mouse.up();
}
