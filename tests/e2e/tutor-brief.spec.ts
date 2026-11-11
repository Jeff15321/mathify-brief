import { expect, test } from '@playwright/test';
const patterns = ['no-answers', 'partial-correct', 'clear-miss', 'simpler-recovery', 'complete-correct', 'all-idk'] as const;
for (const pattern of patterns) test(`tutor overview exposes four facts: ${pattern}`, async ({ page, request }) => {
  const current = (await (await request.get('/api/workspace')).json()).workspace;
  const started = await request.post('/api/workspace/start', { multipart: { questionText: 'Solve 2(x + 3) = 14.', draftId: crypto.randomUUID(), expectedWorkspaceId: current?.workspaceId ?? '' } });
  expect(started.status()).toBe(201);
  const { workspaceId } = await started.json();
  const headers = { 'x-workspace-id': workspaceId };
  expect((await request.post('/api/analyze', { headers })).status()).toBe(200);
  const answer = async (probeId: string, value: string) => { expect((await request.post('/api/probes/answer', { headers, data: { probeId, answer: value } })).status()).toBe(200); };
  if (pattern === 'partial-correct') await answer('s1-main', 'B');
  if (pattern === 'clear-miss' || pattern === 'simpler-recovery') await answer('s1-main', 'A');
  if (pattern === 'simpler-recovery') await answer('s1-easier', 'B');
  if (pattern === 'complete-correct' || pattern === 'all-idk') for (const [i, key] of ['B', 'C', 'B'].entries()) {
    expect((await request.post('/api/probes/generate', { headers })).status()).toBe(200);
    await answer(`s${i + 1}-main`, pattern === 'all-idk' ? 'IDK' : key);
    if (pattern === 'all-idk') await answer(`s${i + 1}-easier`, 'IDK');
  }
  expect((await request.post('/api/brief', { headers, multipart: { submissionId: crypto.randomUUID() } })).status()).toBe(200);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/brief');
  for (const label of ['Original problem', 'Suggested start', 'Confidence on the report']) {
    const section = page.getByRole('region', { name: label });
    await expect(section).toBeVisible();
    const box = await section.boundingBox();
    expect(box && box.y + box.height <= 720).toBeTruthy();
  }
  await expect(page.getByText(/Help outside the app is unknown/)).toBeVisible();
  if (pattern === 'no-answers') await expect(page.getByText(/Understanding is still unknown/)).toBeVisible();
  if (pattern === 'partial-correct') await expect(page.getByText(/coverage is incomplete/)).toBeVisible();
  if (pattern === 'simpler-recovery') await expect(page.getByText('Simpler follow-up: correct', { exact: true })).toBeVisible();
  if (pattern === 'all-idk') await expect(page.getByText('Self-reported uncertainty', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (pattern === 'simpler-recovery') await page.screenshot({ path: 'artifacts/pilot/tutor-phone.png', fullPage: true });
});
