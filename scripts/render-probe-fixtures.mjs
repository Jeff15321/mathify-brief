// Deterministic synthetic source assets; these still require independent educator review.
import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const root = new URL('../tests/fixtures/probe-evaluation/', import.meta.url);
const cases = JSON.parse(await readFile(new URL('cases.json', root), 'utf8'));
await mkdir(new URL('sources/', root), { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 720, height: 320 }, deviceScaleFactor: 1 });
  for (const item of cases) {
    if (item.modality === 'typed') continue;
    const count = item.modality === 'two-photo' ? 2 : 1;
    item.files = [];
    for (let part = 0; part < count; part++) {
      await page.setContent('<main style="padding:36px; font-size:25px; line-height:1.6; background:white; color:#172033"><h1 style="font-size:18px">Practice problem</h1><p></p></main>');
      await page.locator('p').evaluate((el, data) => {
        el.textContent = data.part ? 'Use the information on the first page. Show how you would begin.' : data.text;
        if (data.handwriting) el.style.fontFamily = 'Comic Sans MS, cursive';
      }, { text: item.questionText, part, handwriting: item.modality === 'handwriting-style' });
      const extension = item.modality === 'pdf' ? 'pdf' : 'png';
      const name = `sources/${item.id}-${part + 1}.${extension}`;
      if (extension === 'pdf') await page.pdf({ path: new URL(name, root).pathname, width: '720px', height: '320px', printBackground: true });
      else await page.screenshot({ path: new URL(name, root).pathname });
      item.files.push({ path: name, mimeType: extension === 'pdf' ? 'application/pdf' : 'image/png' });
    }
  }
} finally { await browser.close(); }
await writeFile(new URL('cases.json', root), JSON.stringify(cases, null, 2) + '\n');
