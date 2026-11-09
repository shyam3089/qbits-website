import { firefox } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

await mkdir('../artifacts', { recursive: true });
const browser = await firefox.launch();
try {
  for (const [name, width, height] of [['desktop', 1254, 775], ['tablet', 820, 1180], ['mobile', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.QBITS_CAPTURE_URL || 'http://127.0.0.1:5188/');
    await page.locator('#app[aria-busy="false"]').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `../artifacts/${name}.png`, animations: 'disabled' });
    console.log(JSON.stringify({ name, errors, geometry: await page.evaluate(() => Object.fromEntries(['.site-frame', '.hero', '.headline', '.hero-actions', '.terminal'].map(selector => { const r = document.querySelector(selector).getBoundingClientRect(); return [selector, { x: r.x, y: r.y, width: r.width, height: r.height }]; }))) }));
    await page.close();
  }
} finally { await browser.close(); }
