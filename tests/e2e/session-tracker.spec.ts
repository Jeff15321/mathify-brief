import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

// Sessions and the learner profile outlive workspaces, so each test starts (and the file ends) with none.
async function deleteAllSessions(request: APIRequestContext) {
  const { sessions } = await (await request.get('/api/sessions')).json();
  for (const { id } of sessions) expect((await request.delete(`/api/sessions/${id}`)).status()).toBe(204);
}
test.beforeEach(async ({ request }) => { await deleteAllSessions(request); });
test.afterAll(async ({ request }) => { await deleteAllSessions(request); });

async function completeQuestion(page: Page) {
  await page.goto('/workspace?new=1');
  await page.getByLabel('Question (optional if files provided)').fill('Solve 2(x + 3) = 14.');
  await page.getByRole('button', { name: 'Let’s begin' }).click();
  await expect(page.getByText('Question 1 of 3')).toBeVisible();
  await page.locator('input[name="s1-main"][value="A"]').check();
  const history = page.waitForResponse('**/api/brief/history');
  await page.getByRole('button', { name: 'DEMO: connect to tutor' }).click();
  await expect(page.getByRole('heading', { name: 'Tutor Brief' })).toBeVisible();
  await expect(page).toHaveURL(/\/workspace/);
  expect((await history).status()).toBe(200);
}

test('with no sessions the brief has no past-sessions section', async ({ page }) => {
  await completeQuestion(page);
  await expect(page.getByText('Checking past sessions…')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Relevant from past sessions' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Confidence on the report' })).toBeVisible();
});

test('session upload -> detail -> learner profile -> brief shows relevant past sessions', async ({ page }) => {
  await page.goto('/sessions');
  await expect(page.getByText('No sessions yet')).toBeVisible();
  await page.getByRole('button', { name: 'Add session' }).click();
  await page.getByLabel('Transcript').setInputFiles('samples/sessions/2026-10-03-linear-equations-review.txt');
  await page.getByLabel('Whiteboard images (optional)').setInputFiles('samples/sessions/2026-10-17-whiteboard-area-model-3-x-plus-7.png');
  await page.getByLabel('Session date').fill('2026-10-03');
  await page.getByRole('button', { name: 'Upload session' }).click();

  const card = page.getByRole('listitem').filter({ hasText: 'Linear equations review' });
  await expect(card).toBeVisible();
  await expect(card.getByText('Ready')).toBeVisible();
  await expect(card.getByText('2 observations · 1 whiteboard')).toBeVisible();

  await card.getByRole('link', { name: 'Linear equations review' }).click();
  await page.waitForURL(/\/sessions\/[0-9a-f-]+$/);
  await expect(page.getByText('Multiplied only the first term inside brackets.')).toBeVisible();
  const transcript = page.getByTestId('transcript');
  await expect(transcript).not.toContainText('See you in two weeks.');
  await page.getByRole('button', { name: /Show full transcript/ }).click();
  await expect(page.getByRole('button', { name: 'Collapse', exact: true })).toBeVisible();
  await expect(transcript).toContainText('See you in two weeks.');

  await page.goto('/profile');
  const struggles = page.getByRole('heading', { name: /^Struggles/ }).locator('xpath=ancestor::section[1]');
  await expect(struggles.getByText('Multiplied only the first term inside brackets.')).toBeVisible();
  await expect(struggles.getByRole('link', { name: 'Oct 3, 2026' }).first()).toBeVisible();

  // Editing the taller left column should leave the right column in place.
  const habits = page.getByRole('heading', { name: /^Habits/ });
  const habitsTop = await habits.evaluate(heading => heading.getBoundingClientRect().top);
  await struggles.getByRole('button', { name: 'Add to Struggles' }).click();
  await expect(struggles.getByLabel('Item text')).toBeVisible();
  expect(await habits.evaluate(heading => heading.getBoundingClientRect().top)).toBe(habitsTop);
  await struggles.getByRole('button', { name: 'Cancel' }).click();

  await completeQuestion(page);
  const section = page.getByRole('region', { name: 'Relevant from past sessions' });
  await expect(section).toBeVisible();
  await expect(section.getByRole('listitem')).toHaveCount(2);
  await expect(section.getByText('Worth revisiting: Multiplied only the first term inside brackets')).toBeVisible();
  await expect(section.getByText('Oct 3')).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await section.getByRole('link', { name: 'View learner profile' }).click();
  await page.waitForURL('**/profile');
});
