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
    const wordmark = document.querySelector('.brand-wordmark');
    const heroCopy = document.querySelector('.hero-copy').getBoundingClientRect();
    const heroLayout = document.querySelector('.hero-layout').getBoundingClientRect();
    return {
      frame: rect('.site-frame'), brand: rect('.brand'), github: rect('.github-button'), heroContent: rect('.hero-eyebrow'), actions: rect('.hero-actions'),
      heroCopyWidthRatio: heroCopy.width / heroLayout.width,
      brandSymbolImage: getComputedStyle(document.querySelector('.brand-symbol')).backgroundImage,
      brandWordmarkFont: getComputedStyle(wordmark).fontFamily,
      brandWordmarkWeight: getComputedStyle(wordmark).fontWeight,
      brandWordmarkLoaded: document.fonts.check('500 41px Outfit'),
      bodyFont: getComputedStyle(document.body).fontFamily,
      bodyFontLoaded: document.fonts.check('400 16px "Google Sans Flex"'),
      headline: (() => {
        const element = document.querySelector('.headline');
        return { width: element.clientWidth, scrollWidth: element.scrollWidth, whiteSpace: getComputedStyle(element).whiteSpace };
      })(),
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
  expect(layout.heroCopyWidthRatio).toBeGreaterThan(0.5);
  expect(layout.heroCopyWidthRatio).toBeLessThan(0.6);
  expect(layout.brandSymbolImage).toContain('logo-symbol-original-');
  expect(layout.brandWordmarkFont).toContain('Outfit');
  expect(layout.brandWordmarkWeight).toBe('500');
  expect(layout.brandWordmarkLoaded).toBe(true);
  expect(layout.bodyFont).toContain('Google Sans Flex');
  expect(layout.bodyFontLoaded).toBe(true);
  expect(layout.headline.whiteSpace).toBe('nowrap');
  expect(layout.headline.scrollWidth).toBeLessThanOrEqual(layout.headline.width);
  expect(layout.shell.fill).not.toBe('none');
  expect(layout.shell.outerEdges).toEqual([false, false, false, false]);
  expect(layout.shell.panel).toEqual([false, false, false, false, false]);
  expect(layout.shell.recesses).toEqual([true, true]);
  expect(layout.shell.besideRecesses).toEqual([false, false, false]);
  expect(layout.scroll).toBe(false); expect(errors).toEqual([]);
  const heroOrder = await page.evaluate(() => {
    const description = document.querySelector('.hero-description').getBoundingClientRect();
    const actionsElement = document.querySelector('.hero-actions');
    const actions = actionsElement.getBoundingClientRect();
    return {
      descriptionBottom: description.bottom,
      actionsTop: actions.top,
      featuresAbsent: document.querySelector('.hero-features') === null,
      actionsInsideLayout: actionsElement.parentElement === document.querySelector('.hero-layout'),
    };
  });
  expect(heroOrder.featuresAbsent).toBe(true);
  expect(heroOrder.actionsTop).toBeGreaterThanOrEqual(heroOrder.descriptionBottom);
  expect(heroOrder.actionsInsideLayout).toBe(true);
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

test('hero stays vertically centered in the frame at desktop and mobile sizes', async ({ page }) => {
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1366, height: 650 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/'); await ready(page);
    const geometry = await page.evaluate(() => {
      const frame = document.querySelector('.site-frame').getBoundingClientRect();
      const hero = document.querySelector('.hero').getBoundingClientRect();
      const container = document.querySelector('.view-container').getBoundingClientRect();
      return { frame: { top: frame.top, bottom: frame.bottom }, hero: { top: hero.top, bottom: hero.bottom }, container: { top: container.top, bottom: container.bottom } };
    });
    const alignment = Math.abs((geometry.frame.top + geometry.frame.bottom) / 2 - (geometry.hero.top + geometry.hero.bottom) / 2);
    expect(alignment, JSON.stringify({ viewport, geometry })).toBeLessThanOrEqual(1);
  }
});

test('hero headline stays on one line and auto-fits after viewport changes', async ({ page }) => {
  await page.goto('/'); await ready(page);
  for (const width of [1254, 850, 390]) {
    await page.setViewportSize({ width, height: 775 });
    const headline = page.locator('.headline');
    await expect(headline).toBeVisible();
    const fit = await headline.evaluate(element => ({
      width: element.clientWidth,
      contentWidth: element.scrollWidth,
      whiteSpace: getComputedStyle(element).whiteSpace,
    }));
    expect(fit.whiteSpace).toBe('nowrap');
    expect(fit.contentWidth).toBeLessThanOrEqual(fit.width);
  }
});

test('hero logo flies into place once and stays settled on hover', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/'); await ready(page);
  const logo = page.locator('.hero-art-logo');
  await expect(logo).toHaveCSS('animation-name', 'hero-logo-arrive');
  await expect(logo).toHaveCSS('animation-duration', '3s');
  await expect(logo).toHaveCSS('animation-delay', '0.5s');
  await expect(logo).toHaveCSS('animation-fill-mode', 'both');
  const shadow = page.locator('.hero-art');
  await expect(shadow).toHaveCSS('animation-name', 'none');
  await expect.poll(() => shadow.evaluate(element => getComputedStyle(element, '::after').animationName)).toBe('hero-logo-shadow-arrive');
  await expect.poll(() => shadow.evaluate(element => getComputedStyle(element, '::after').animationDelay)).toBe('0.5s');
  await expect.poll(() => shadow.evaluate(element => getComputedStyle(element, '::after').animationDuration)).toBe('3s');
  await expect.poll(() => logo.evaluate(element =>
    element.getAnimations().some(animation => animation.playState === 'finished'))).toBe(true);
  await expect.poll(() => logo.evaluate(element =>
    new DOMMatrixReadOnly(getComputedStyle(element).transform).isIdentity)).toBe(true);
  await expect(logo).toHaveCSS('opacity', '1');
  const bounds = await logo.boundingBox();
  await page.mouse.move(bounds.x + bounds.width * .2, bounds.y + bounds.height * .25);
  await expect.poll(() => logo.evaluate(element =>
    new DOMMatrixReadOnly(getComputedStyle(element).transform).isIdentity)).toBe(true);
  await expect(logo).toHaveCSS('opacity', '1');
});

test('hero logo SVG and entrance animation restart when returning home', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/'); await ready(page);
  const logo = page.locator('.hero-art-logo');
  await expect(logo.locator('.hero-logo-svg')).toBeVisible();
  await expect.poll(() => logo.evaluate(element =>
    element.getAnimations().some(animation => animation.playState === 'finished'))).toBe(true);

  await page.getByRole('button', { name: 'Docs', exact: true }).click();
  await expect(page).toHaveURL(/\/docs$/);
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('.hero-art-logo .hero-logo-svg')).toBeVisible();
  await expect(page.locator('.hero-art-logo')).toHaveCSS('animation-name', 'hero-logo-arrive');
  await expect.poll(() => page.locator('.hero-art-logo').evaluate(element =>
    element.getAnimations().some(animation => animation.playState === 'running'))).toBe(true);
  await expect.poll(() => page.locator('.hero-art-logo').evaluate(element =>
    element.getAnimations().some(animation => animation.playState === 'finished'))).toBe(true);
  await expect(page.locator('.hero-art-logo')).toHaveCSS('opacity', '1');
});

test('hero logo inner square has a reduced-motion-aware animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/'); await ready(page);
  const square = page.locator('.hero-logo-svg .inner-square');
  await expect(square).toBeVisible();
  const animation = square.locator('animateTransform');
  await expect(animation).toHaveAttribute('calcMode', 'linear');
  await expect(animation).toHaveAttribute('dur', '2.4s');
  const opacityAnimation = square.locator('animate[attributeName="opacity"]');
  await expect(opacityAnimation).toHaveAttribute('values', '1; 0');
  const before = await square.evaluate(element => {
    const box = element.getBoundingClientRect();
    return { x: box.x, y: box.y, opacity: getComputedStyle(element).opacity, fill: getComputedStyle(element).fill };
  });
  expect(before.fill).toBe('rgb(255, 255, 255)');
  await page.waitForTimeout(1200);
  const after = await square.evaluate(element => {
    const box = element.getBoundingClientRect();
    return { x: box.x, y: box.y, opacity: getComputedStyle(element).opacity, fill: getComputedStyle(element).fill };
  });
  expect(after.x).toBeGreaterThan(before.x);
  expect(after.y).toBeLessThan(before.y);
  expect(Number(after.opacity)).toBeLessThan(Number(before.opacity));
  expect(after.fill).toBe(before.fill);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => square.evaluate(element => getComputedStyle(element).opacity)).toBe(after.opacity);
});

test('CTA waves are paused and an external gradient glow expands on hover', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/'); await ready(page);
  const cta = page.getByRole('button', { name: 'Documentation', exact: true });
  await expect(cta.locator('.cta-wave')).toHaveCount(0);
  const before = await cta.evaluate(button => ({
    filter: getComputedStyle(button).filter,
    boxShadow: getComputedStyle(button).boxShadow,
    transition: getComputedStyle(button).transition,
  }));
  expect(await cta.evaluate(button => getComputedStyle(button).overflow)).toBe('visible');
  await cta.hover();
  await expect.poll(() => cta.evaluate(button => getComputedStyle(button).filter)).not.toBe(before.filter);
  expect(await cta.evaluate(button => getComputedStyle(button).transition)).toContain('filter 0.9s');
  expect(await cta.evaluate(button => getComputedStyle(button).boxShadow)).toBe(before.boxShadow);
  expect(await cta.evaluate(button => getComputedStyle(button, '::before').content)).toBe('none');
  await expect(cta.locator('.cta-wave')).toHaveCount(0);
});

test('all CTA buttons share one gradient glow on hover and focus', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/'); await ready(page);
  const buttons = [
    page.getByRole('button', { name: 'Documentation', exact: true }),
    page.getByRole('button', { name: 'Install qbits', exact: true }),
    page.getByRole('link', { name: 'Qbits on GitHub' }),
  ];
  const filters = [];
  for (const button of buttons) {
    const idleFilter = await button.evaluate(element => getComputedStyle(element).filter);
    const transition = await button.evaluate(element => getComputedStyle(element).transition);
    expect(transition).toContain('filter 0.9s');
    await button.hover();
    await expect.poll(() => button.evaluate(element => getComputedStyle(element).filter)).not.toBe(idleFilter);
    filters.push(await button.evaluate(element => getComputedStyle(element).filter));
    await button.focus();
    await expect(button).toBeFocused();
  }
  expect(new Set(filters).size).toBe(1);
});

test('install button uses a filled download icon that animates downward', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/'); await ready(page);
  const install = page.getByRole('button', { name: 'Install qbits', exact: true });
  const icon = install.locator('.button-icon');
  const iconStyles = await icon.evaluate(element => ({
    maskImage: getComputedStyle(element).maskImage,
    backgroundColor: getComputedStyle(element).backgroundColor,
  }));
  expect(decodeURIComponent(iconStyles.maskImage)).toContain('icons-tabler-filled icon-tabler-download');
  expect(iconStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');

  await install.hover();
  await expect.poll(() => icon.evaluate(element => getComputedStyle(element).animationName)).toBe('install-download-bounce');
  await expect.poll(() => icon.evaluate(element => getComputedStyle(element).transform)).not.toBe('matrix(1, 0, 0, 1, 0, 0)');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => icon.evaluate(element => getComputedStyle(element).animationName)).toBe('none');
});

test('all CTA icons animate on hover and focus', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/'); await ready(page);
  const ctas = [
    { button: page.getByRole('button', { name: 'Documentation', exact: true }), icon: '.button-icon', animation: 'cta-icon-bob' },
    { button: page.getByRole('button', { name: 'Install qbits', exact: true }), icon: '.button-icon', animation: 'install-download-bounce' },
    { button: page.getByRole('link', { name: 'Qbits on GitHub' }), icon: '.github-icon', animation: 'cta-icon-bob' },
  ];

  for (const { button, icon: iconSelector, animation } of ctas) {
    const icon = button.locator(iconSelector);
    await button.hover();
    await expect.poll(() => icon.evaluate(element => getComputedStyle(element).animationName)).toBe(animation);
    await button.focus();
    await expect.poll(() => icon.evaluate(element => getComputedStyle(element).animationName)).toBe(animation);
  }

  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const { button, icon: iconSelector } of ctas) {
    await expect.poll(() => button.locator(iconSelector).evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  }
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
  await expect(copyButton.locator('.copy-code-icon')).not.toHaveClass(/is-copied/);
  await copyButton.click();
  await expect(block.getByRole('button', { name: 'Copied!' })).toBeVisible();
  await expect(block.locator('.copy-code-icon')).toHaveClass(/is-copied/);
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
