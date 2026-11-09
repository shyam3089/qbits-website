import { test, expect } from '@playwright/test';

const ready = async page => {
  await expect(page.locator('#app')).toHaveAttribute('aria-busy', 'false');
  await page.evaluate(() => document.fonts.ready);
};

test('approved desktop geometry, both curves, logo and contained UI', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await ready(page);
  await expect(page.getByRole('heading', { name: 'Build modern apps with less code' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Qbits symbol' })).toBeVisible();
  const layout = await page.evaluate(() => {
    const rect = selector => { const { x, y, width, height } = document.querySelector(selector).getBoundingClientRect(); return { x, y, width, height }; };
    const shell = document.querySelector('.frame-shell');
    const { width, height } = shell.ownerSVGElement.viewBox.baseVal;
    const filled = (x, y) => shell.isPointInFill(new DOMPoint(x, y));
    return {
      frame: rect('.site-frame'), brand: rect('.brand'), github: rect('.github-button'), heroContent: rect('.hero-eyebrow'), actions: rect('.hero-actions'),
      shell: {
        fill: getComputedStyle(shell).fill,
        outerEdges: [filled(width / 4, 8), filled(8, height / 2), filled(width - 8, height / 2), filled(width * .75, height - 8)],
        panel: [filled(width / 4, 24), filled(24, height / 2), filled(width - 24, height / 2), filled(width * .75, height - 24), filled(width / 2, height / 2)],
        recesses: [filled(width - 100, 50), filled(120, height - 45)],
        besideRecesses: [filled(width - 100, 125), filled(120, height - 100), filled(width - 100, height - 45)],
      },
      scroll: document.documentElement.scrollWidth > innerWidth,
    };
  });
  expect(layout.frame).toEqual({ x: 44, y: 20, width: 1166, height: 723 });
  expect(Math.abs((layout.brand.x - layout.frame.x) - ((layout.frame.x + layout.frame.width) - (layout.github.x + layout.github.width)))).toBeLessThan(1);
  expect(layout.heroContent.x).toBe(122);
  expect(Math.abs(layout.actions.y - 467)).toBeLessThan(5);
  expect(layout.shell.fill).not.toBe('none');
  expect(layout.shell.outerEdges).toEqual([false, false, false, false]);
  expect(layout.shell.panel).toEqual([false, false, false, false, false]);
  expect(layout.shell.recesses).toEqual([true, true]);
  expect(layout.shell.besideRecesses).toEqual([false, false, false]);
  expect(layout.scroll).toBe(false); expect(errors).toEqual([]);
  await page.screenshot({ path: '../artifacts/desktop.png', animations: 'disabled' });
});

test('short desktop keeps both hero buttons fully visible', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 650 });
  await page.goto('/'); await ready(page);
  const layout = await page.locator('.hero').evaluate(hero => {
    const { top, right, bottom, left } = hero.getBoundingClientRect();
    return {
      viewport: { top, right, bottom, left },
      buttons: [...hero.querySelectorAll('.action-button')].map(button => {
        const { top, right, bottom, left } = button.getBoundingClientRect();
        return { top, right, bottom, left };
      }),
    };
  });
  expect(layout.buttons).toHaveLength(2);
  for (const button of layout.buttons) {
    expect(button.top).toBeGreaterThanOrEqual(layout.viewport.top);
    expect(button.left).toBeGreaterThanOrEqual(layout.viewport.left);
    expect(button.right).toBeLessThanOrEqual(layout.viewport.right);
    expect(button.bottom).toBeLessThanOrEqual(layout.viewport.bottom);
  }
  await page.screenshot({ path: '../artifacts/short-desktop.png', animations: 'disabled' });
});

test('navigation, history, direct URLs and both hero CTAs', async ({ page }) => {
  await page.goto('/'); await ready(page);
  for (const [label, slug, heading] of [
    ['Features', 'features', 'Small syntax. Real possibilities.'],
    ['Docs', 'docs', 'A little code. A good place to start.'],
    ['Examples', 'examples', 'Ideas, in a few lines.'],
    ['Roadmap', 'roadmap', 'A thoughtful path forward.'],
  ]) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${slug}$`));
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    await expect(page.getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('.site-frame')).toHaveClass(/content-page/);
    await expect(page.locator('.section-sidebar')).toBeVisible();
  }
  await page.goBack(); await expect(page.getByRole('heading', { name: 'Ideas, in a few lines.' })).toBeVisible();
  await page.reload(); await expect(page.getByRole('heading', { name: 'Ideas, in a few lines.' })).toBeVisible();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.locator('.site-frame')).not.toHaveClass(/content-page/);
  await page.getByRole('button', { name: 'Install qbits', exact: true }).click();
  await expect(page.getByRole('heading', { name: '01 — Install Qbits' })).toBeVisible();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Documentation', exact: true }).click();
  await expect(page).toHaveURL(/\/docs$/);
});

test('copy exact install command, copy example, and functional external destinations', async ({ page, context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => { window.copied = value; } } });
    window.open = (url, target, features) => { window.opened = { url, target, features }; };
  });
  await page.goto('/'); await ready(page);
  await page.getByRole('button', { name: 'Copy install command' }).click();
  await expect(page.getByText('Copied!', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.copied)).toBe('npm install qbits');
  await page.getByRole('link', { name: 'Qbits on GitHub' }).click();
  expect(await page.evaluate(() => window.opened)).toEqual({ url: 'https://github.com/shyam3089/qubits', target: '_blank', features: 'noopener,noreferrer' });
  await page.goto('/docs'); await ready(page);
  const block = page.locator('.code-block').first();
  const copyButton = block.getByRole('button', { name: 'Copy code' });
  await expect(copyButton).toBeVisible();
  await expect(copyButton.locator('.copy-code-icon')).toHaveClass(/fa-copy/);
  await copyButton.click();
  await expect(block.getByRole('button', { name: 'Copied!' })).toBeVisible();
  await expect(block.locator('.copy-code-icon')).toHaveClass(/fa-check/);
  expect(await page.evaluate(() => window.copied)).toContain('npm install qbits');
  await page.getByRole('button', { name: 'View package on npm' }).click();
  expect((await page.evaluate(() => window.opened)).url).toBe('https://www.npmjs.com/package/qbits');
});

test('documentation uses regular page scrolling and linked section navigation', async ({ page }) => {
  let fail = true;
  await page.route('**/api/pages/docs', async route => {
    if (fail) await route.fulfill({ status: 503, json: { detail: 'offline' } }); else await route.continue();
  });
  await page.goto('/docs');
  await expect(page.getByText('We could not load this page.', { exact: false })).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'A little code. A good place to start.' })).toBeVisible();
  const scroll = await page.evaluate(() => ({
    documentHeight: document.documentElement.scrollHeight,
    viewportHeight: innerHeight,
    innerOverflow: getComputedStyle(document.querySelector('.inner-view')).overflowY,
  }));
  expect(scroll.documentHeight).toBeGreaterThan(scroll.viewportHeight);
  expect(scroll.innerOverflow).toBe('visible');
  const compilerLink = page.getByRole('button', { name: /Connect the compiler/ });
  await expect(compilerLink).toBeVisible();
  await compilerLink.click();
  await expect(page).toHaveURL(/\/docs#vite$/);
  await expect(page.locator('#vite')).toBeVisible();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  await expect(compilerLink).toHaveAttribute('aria-current', 'location');
  const stylingLink = page.getByRole('button', { name: /Make it yours/ });
  await page.locator('#styling').evaluate(section => section.scrollIntoView({ block: 'start' }));
  await expect(stylingLink).toHaveAttribute('aria-current', 'location');
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'auto' }));
  await expect(page.getByRole('button', { name: /Install Qbits/ }).first()).toHaveAttribute('aria-current', 'location');
});

test('settings failure has a recoverable connection state', async ({ page }) => {
  let fail = true;
  await page.route('**/api/site', async route => { if (fail) await route.abort(); else await route.continue(); });
  await page.goto('/');
  await expect(page.getByText('Site settings could not be loaded.', { exact: false })).toBeVisible();
  fail = false; await page.getByRole('button', { name: 'Retry connection' }).click();
  await expect(page.locator('.site-notice')).toBeEmpty();
});

test('keyboard skip control, focused navigation and reduced motion', async ({ page }) => {
  await page.goto('/'); await ready(page);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page.locator('main')).toBeFocused();
  await page.getByRole('button', { name: 'Docs', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'A little code. A good place to start.' })).toBeVisible();
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  expect(await page.locator('.terminal-cursor').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  const before = await page.locator('.banner-canvas').evaluate(canvas => canvas.toDataURL());
  // Observe across multiple animation frames instead of relying on a screenshot freeze.
  await page.evaluate(() => new Promise(resolve => { let count = 0; const frame = () => ++count === 8 ? resolve() : requestAnimationFrame(frame); frame(); }));
  expect(await page.locator('.banner-canvas').evaluate(canvas => canvas.toDataURL())).toBe(before);
  await expect(page.locator('video')).toHaveCount(0);
});

test('real Firefox clipboard write succeeds from a user click', async ({ page }) => {
  await page.goto('/'); await ready(page);
  await page.getByRole('button', { name: 'Copy install command' }).click();
  await expect(page.getByText('Copied!', { exact: true })).toBeVisible();
});

for (const [label, width, height] of [['tablet', 820, 1180], ['mobile', 390, 844], ['small-mobile', 320, 568]]) {
  test(`${label}: responsive frame, usable navigation and internal scrolling`, async ({ page }) => {
    await page.setViewportSize({ width, height }); await page.goto('/'); await ready(page);
    const bounds = await page.evaluate(() => {
      const frame = document.querySelector('.site-frame').getBoundingClientRect();
      return { x: frame.x, right: frame.right, bottom: frame.bottom, horizontal: document.documentElement.scrollWidth > innerWidth, vertical: document.documentElement.scrollHeight > innerHeight };
    });
    expect(bounds.x).toBeGreaterThan(0); expect(bounds.right).toBeLessThan(width); expect(bounds.bottom).toBeLessThan(height);
    expect(bounds.horizontal).toBe(false); expect(bounds.vertical).toBe(false);
    await page.getByRole('button', { name: 'Documentation', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'A little code. A good place to start.' })).toBeVisible();
    await page.getByRole('button', { name: 'Roadmap', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'A thoughtful path forward.' })).toBeVisible();
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await page.screenshot({ path: `../artifacts/${label}.png`, animations: 'disabled' });
  });
}

test('light banner animates, pauses off home, and respects motion changes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/'); await ready(page);
  const canvas = page.locator('.banner-canvas');
  const snapshot = () => canvas.evaluate(canvas => canvas.toDataURL());
  const initial = await snapshot();
  await expect.poll(snapshot).not.toBe(initial);
  await expect(page.locator('video')).toHaveCount(0);
  await page.getByRole('button', { name: 'Docs', exact: true }).click();
  await expect(canvas).toBeHidden();
  const paused = await snapshot();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await snapshot()).toBe(paused);
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(canvas).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  const still = await snapshot();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await snapshot()).toBe(still);
  expect(await canvas.evaluate(canvas => canvas.getContext('2d').getImageData(0, 0, 1, 1).data[3])).toBe(0);
  await page.screenshot({ path: '../artifacts/light-banner-desktop.png', animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '../artifacts/light-banner-mobile.png', animations: 'disabled' });
});

test('admin authentication, persistence, theme preview, validation and logout', async ({ page, request }) => {
  const original = await (await request.get('/api/site')).json();
  await page.goto('/admin'); await ready(page);
  await expect(page.getByLabel('Admin password')).toHaveAttribute('type', 'password');
  await page.getByLabel('Admin password').fill('incorrect');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Incorrect password')).toBeVisible();
  await page.getByLabel('Admin password').fill('e2e-fixture-only');
  await page.getByLabel('Admin password').press('Enter');
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  try {
    await page.getByLabel('GitHub URL', { exact: true }).fill('javascript:bad');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.locator('.admin-message')).toContainText('HTTPS');
    await page.getByLabel('GitHub URL', { exact: true }).fill('https://github.com/shyam3089/qubits/issues');
    await page.getByLabel('npm package URL', { exact: true }).fill('https://www.npmjs.com/package/qbits?activeTab=readme');
    await page.getByRole('button', { name: 'Apple Light', exact: true }).click();
    await page.getByRole('button', { name: 'Preview theme', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'apple');
    await page.getByRole('button', { name: 'Midnight', exact: true }).click();
    await page.getByLabel('--accent', { exact: true }).fill('#88ddff');
    await page.getByRole('button', { name: 'Preview theme', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'midnight');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByText('Saved. Your changes are live on this server.')).toBeVisible();
    const saved = await (await request.get('/api/site')).json();
    expect(saved.theme).toBe('midnight'); expect(saved.tokens['--accent']).toBe('#88ddff');
    expect(saved.github_url).toContain('/issues'); expect(saved.npm_url).toContain('activeTab=readme');
    await page.reload(); await ready(page);
    await expect(page.getByLabel('GitHub URL', { exact: true })).toHaveValue(saved.github_url);
    await page.screenshot({ path: '../artifacts/admin.png', animations: 'disabled' });
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page.getByLabel('Admin password')).toBeVisible();
    await page.reload(); await expect(page.getByLabel('Admin password')).toBeVisible();
  } finally {
    const login = await request.post('/api/admin/login', { data: { password: 'e2e-fixture-only' } });
    const { csrf } = await login.json();
    await request.put('/api/admin/site', { data: original, headers: { 'X-Qbits-CSRF': csrf } });
  }
});

test('unknown URL stays within the frame', async ({ page }) => {
  await page.goto('/not-a-page'); await ready(page);
  await expect(page.getByRole('heading', { name: 'This page wandered off.' })).toBeVisible();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Build modern apps with less code' })).toBeVisible();
});
