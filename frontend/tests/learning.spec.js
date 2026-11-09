import { test, expect } from '@playwright/test';

for (const slug of ['docs', 'features']) {
  test(`${slug}: live examples react, remain independent, and reset on navigation`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`/${slug}`);
    const demos = page.locator('.live-demo');
    const counter = demos.getByRole('button', { name: 'Count: 0', exact: true }).first();
    await counter.click();
    await expect(demos.getByRole('button', { name: 'Count: 1', exact: true }).first()).toBeVisible();
    const greeting = page.locator('.demo-greeting');
    const input = greeting.getByRole('textbox', { name: 'Your name' });
    await input.fill('Ada <script>');
    await expect(greeting.getByRole('status')).toHaveText('Hello, Ada <script>');
    await expect(input).toBeFocused();
    await input.fill('');
    await expect(greeting.getByRole('status')).toHaveText('Enter your name');
    if (slug === 'features') {
      const child = page.locator('.demo-panel').getByRole('button', { name: 'Count: 0' });
      await child.click();
      await expect(page.locator('.demo-panel').getByRole('button', { name: 'Count: 1' })).toBeVisible();
      await expect(page.locator('#syntax .demo-counter button')).toHaveText('Count: 1');
    }
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await page.getByRole('button', { name: slug === 'docs' ? 'Docs' : 'Features', exact: true }).click();
    await expect(page.locator('.demo-counter button').first()).toHaveText('Count: 0');
    expect(errors).toEqual([]);
  });
}

test('highlighting preserves exact source and copies HTML safely at mobile width', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { window.copied = text; } } });
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/docs');
  await expect(page.locator('#html-entry .code-source')).toBeVisible();
  const data = await (await page.request.get('/api/pages/docs')).json();
  for (const section of data.sections.filter(section => section.code)) {
    const block = page.locator(`#${section.id} .code-block`);
    await expect(block.locator('.code-source')).toHaveText(section.code);
    await expect(block.locator('[class^="syntax-"]').first()).toBeAttached();
    await expect(page.locator(`#${section.id} .code-explanation`)).toBeAttached();
  }
  const block = page.locator('#html-entry .code-block');
  await expect(block.locator('.code-source script')).toHaveCount(0);
  await block.getByRole('button', { name: 'Copy code' }).click();
  expect(await page.evaluate(() => window.copied)).toBe(data.sections.find(section => section.id === 'html-entry').code);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const colors = await page.locator('#first-component .code-source').evaluate(node => {
    const color = selector => getComputedStyle(node.querySelector(selector)).color;
    return [color('.syntax-keyword'), color('.syntax-string'), color('.syntax-number')];
  });
  expect(new Set(colors).size).toBe(3);
});
