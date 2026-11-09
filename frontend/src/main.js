import '@fontsource/poppins/latin-300.css';
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import './styles.css';
import rawTokens from './themes/tokens.css?raw';
import App from './App.qb';
import PageContent from './components/PageContent.qb';
import Admin from './components/Admin.qb';
import * as runtime from 'qbits/runtime';
import { mountFrameArt } from './platform/visuals.js';
import { mountBanner } from './platform/banner.js';
import { highlightCode } from './platform/code.js';

// Qbits 1.0.1 deliberately has no async expressions, arbitrary DOM attributes,
// canvas or clipboard API. This host adapter supplies those browser capabilities;
// the framework owns every view, control, form binding and content list.
const root = document.getElementById('app');
const app = App(root, runtime);
const frame = root.querySelector('.site-frame');
const frameArt = mountFrameArt(root.querySelector('.frame-art'));
const quantum = mountBanner(root.querySelector('.quantum-background'));
const routeNames = new Set(['home', 'features', 'docs', 'examples', 'roadmap', 'admin']);
const contentPageNames = new Set(['features', 'docs', 'examples', 'roadmap']);
const themeNames = ['neon', 'ultraviolet', 'midnight', 'apple'];
let config = null, pageView = null, adminView = null, csrf = '', pageRequest = null;
let activePage = 'home', requestVersion = 0, feedbackTimer, adminVersion = 0;
let selectedTheme = 'apple', appliedKeys = [], previewing = false;
let sectionScrollCleanup = null;

const tokenNames = [...rawTokens.split(":root[data-theme=")[0].matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)]
  .filter(([, key, value]) => !value.includes('url(') && !key.startsWith('--icon-') && !key.startsWith('--breakpoint-'))
  .map(([, key]) => key);
const defaults = {};
for (const theme of themeNames) {
  document.documentElement.dataset.theme = theme;
  const computed = getComputedStyle(document.documentElement);
  defaults[theme] = Object.fromEntries(tokenNames.map(name => [name, computed.getPropertyValue(name).trim()]));
}
document.documentElement.dataset.theme = 'apple';

const settingsLabels = {
  name: 'Site name', eyebrow: 'Eyebrow', headline: 'Headline', highlight: 'Headline highlight',
  description: 'Description — first line', description_second: 'Description — second line',
  github_url: 'GitHub URL', npm_url: 'npm package URL', install_command: 'Install command',
};

function attrs(element, values) {
  if (!element) return;
  for (const [name, value] of Object.entries(values)) element.setAttribute(name, value);
}

function updateNavIndicator() {
  const links = root.querySelector('.nav-links');
  const activeItem = links?.querySelector(".nav-item[aria-current='page']");
  if (!links || !activeItem) return;
  links.style.setProperty('--nav-active-x', `${activeItem.offsetLeft}px`);
  links.style.setProperty('--nav-active-width', `${activeItem.offsetWidth}px`);
}

function accessibility() {
  attrs(root.querySelector('.navigation'), { role: 'navigation', 'aria-label': 'Main navigation' });
  attrs(root.querySelector('.brand'), { 'aria-label': 'Qbits home' });
  attrs(root.querySelector('.view-container'), { id: 'main-content', tabindex: '-1', 'aria-label': activePage === 'home' ? 'Qbits overview' : activePage });
  attrs(root.querySelector('.site-notice'), { role: 'status', 'aria-live': 'polite' });
  attrs(root.querySelector('.copy-feedback'), { role: 'status', 'aria-live': 'polite' });
  attrs(root.querySelector('.terminal-command'), { 'aria-label': 'Copy install command' });
  attrs(root.querySelector('.github-button'), { role: 'link', 'aria-label': 'Qbits on GitHub (opens a new tab)' });
  attrs(root.querySelector('.hero-symbol'), { role: 'img', 'aria-label': 'Qbits symbol' });
  for (const icon of root.querySelectorAll('.brand-symbol, .button-icon, .github-icon, .terminal-copy-icon, .terminal-prompt, .copy-code-icon, .external-icon, .terminal-divider, .terminal-cursor, .eyebrow-line')) attrs(icon, { 'aria-hidden': 'true' });
  for (const page of routeNames) for (const item of root.querySelectorAll(`.nav-item.nav-${page}`)) {
    if (page === activePage) item.setAttribute('aria-current', 'page'); else item.removeAttribute('aria-current');
  }
  updateNavIndicator();
  const password = root.querySelector('.password-input');
  attrs(password, { type: 'password', autocomplete: 'current-password', name: 'password', maxlength: '256' });
  attrs(root.querySelector('.admin-message'), { role: 'status', 'aria-live': 'polite' });
  for (const input of root.querySelectorAll('.setting-input')) {
    const label = input.closest('label').querySelector('span').textContent;
    const key = Object.keys(settingsLabels).find(key => settingsLabels[key] === label);
    attrs(input, { name: key, type: key.endsWith('_url') ? 'url' : 'text', autocomplete: 'off' });
  }
  for (const input of root.querySelectorAll('.token-input')) attrs(input, { name: input.closest('label').querySelector('span').textContent, autocomplete: 'off', spellcheck: 'false' });
  for (const theme of themeNames) attrs(root.querySelector(`.theme-${theme}`), { 'aria-pressed': String(theme === selectedTheme) });
  attrs(root.querySelector('.inner-view'), { tabindex: '0', 'aria-label': `${activePage} content` });
  attrs(root.querySelector('.section-sidebar'), { role: 'navigation', 'aria-label': 'Page sections' });
  for (const code of root.querySelectorAll('.code-block p')) attrs(code, { role: 'code' });
  for (const output of root.querySelectorAll('.demo-greeting > p')) attrs(output, { role: 'status', 'aria-live': 'polite' });
}

function wireSectionNavigation(sections) {
  const links = [...root.querySelectorAll('.section-link')];
  const contentSections = [...root.querySelectorAll('.content-section')];
  sections.forEach((section, index) => {
    attrs(contentSections[index], { id: section.id });
    attrs(links[index], { 'aria-controls': section.id });
  });
  const setActive = index => {
    links.forEach((link, linkIndex) => {
      if (linkIndex === index) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  let frame = 0;
  const updateActive = () => {
    frame = 0;
    const headerOffset = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) + 32;
    let active = 0;
    contentSections.forEach((section, index) => {
      if (section.getBoundingClientRect().top <= headerOffset) active = index;
    });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) active = contentSections.length - 1;
    setActive(active);
  };
  const scheduleUpdate = () => {
    if (!frame) frame = requestAnimationFrame(updateActive);
  };
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);
  sectionScrollCleanup = () => {
    window.removeEventListener('scroll', scheduleUpdate);
    window.removeEventListener('resize', scheduleUpdate);
    cancelAnimationFrame(frame);
  };
  const hash = decodeURIComponent(window.location.hash.slice(1));
  const linked = sections.findIndex(section => section.id === hash);
  if (linked >= 0) {
    setActive(linked);
    requestAnimationFrame(() => contentSections[linked]?.scrollIntoView({ block: 'start' }));
  } else {
    scheduleUpdate();
  }
  accessibility();
}

const observer = new MutationObserver(accessibility);
observer.observe(root, { childList: true, subtree: true });

async function api(path, options = {}) {
  const { headers: extraHeaders, ...rest } = options;
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin', ...rest,
    headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-Qbits-CSRF': csrf } : {}), ...extraHeaders },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(body.detail) ? body.detail.map(item => `${item.loc.slice(1).join('.')}: ${item.msg}`).join('; ') : body.detail;
    const error = new Error(message || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return body;
}

function applyTheme(theme, tokens = {}) {
  for (const name of appliedKeys) document.documentElement.style.removeProperty(name);
  appliedKeys = [];
  document.documentElement.dataset.theme = theme;
  for (const [name, value] of Object.entries(tokens)) {
    if (!tokenNames.includes(name)) continue;
    document.documentElement.style.setProperty(name, value);
    appliedKeys.push(name);
  }
  quantum.refresh();
  frameArt.refresh();
}

function applyConfig(next) {
  config = next;
  applyTheme(config.theme, config.tokens);
  const separator = config.install_command.indexOf(' ');
  app.updateState({
    name: config.name, eyebrow: config.eyebrow, headline: config.headline, highlight: config.highlight,
    description: config.description, second: config.description_second,
    prefix: separator < 0 ? config.install_command : config.install_command.slice(0, separator),
    remainder: separator < 0 ? '' : config.install_command.slice(separator), notice: '',
  });
  updateTitle();
  document.querySelector('meta[name="description"]').content = `${config.description} ${config.description_second}`;
  accessibility();
}

function updateTitle() {
  const brand = config?.name || 'Qbits';
  document.title = activePage === 'home' ? `${brand} — Build modern apps with less code` : `${activePage[0].toUpperCase() + activePage.slice(1)} — ${brand}`;
}

async function loadSite() {
  root.setAttribute('aria-busy', 'true');
  try { applyConfig(await api('/site')); }
  catch { app.updateState({ notice: 'Site settings could not be loaded. Check the backend connection.' }); }
  finally { root.setAttribute('aria-busy', 'false'); }
}

function pathPage() {
  const path = window.location.pathname;
  if (path === '/') return 'home';
  const name = path.slice(1);
  return routeNames.has(name) ? name : 'not-found';
}

async function route(page, push = false, focus = false) {
  const version = ++requestVersion;
  if (contentPageNames.has(page) || contentPageNames.has(activePage)) window.scrollTo({ top: 0, behavior: 'auto' });
  sectionScrollCleanup?.(); sectionScrollCleanup = null;
  pageRequest?.abort();
  pageView?.(); pageView = null;
  adminView?.(); adminView = null;
  ++adminVersion;
  if (previewing && config) { applyTheme(config.theme, config.tokens); previewing = false; }
  activePage = page;
  if (push) {
    const path = page === 'home' ? '/' : `/${page}`;
    if (window.location.pathname !== path) history.pushState({}, '', path);
  }
  app.updateState({ page });
  frame.dataset.page = page;
  quantum.setPage(page);
  frame.classList.toggle('content-page', contentPageNames.has(page));
  updateTitle(); accessibility();
  if (focus) root.querySelector('.view-container').focus({ preventScroll: true });
  if (page === 'home') return;
  const target = root.querySelector('.inner-view');
  if (page === 'admin') { await loadAdmin(target); return; }
  pageView = PageContent(target, runtime);
  if (page === 'not-found') {
    pageView.updateState({ title: 'This page wandered off.', intro: 'Choose a page from the navigation to find your way back.', loading: false });
    return;
  }
  pageRequest = new AbortController();
  attrs(target, { 'aria-busy': 'true' });
  try {
    const result = await api(`/pages/${page}`, { signal: pageRequest.signal });
    if (version !== requestVersion) return;
    pageView.updateState({ title: result.title, intro: result.intro, sections: result.sections, navigation: contentPageNames.has(page), loading: false, error: '' });
    if (contentPageNames.has(page)) wireSectionNavigation(result.sections);
    for (const section of root.querySelectorAll('.content-section')) {
      const code = section.querySelector('.code-source');
      if (code) highlightCode(code, section.querySelector('.code-language').textContent);
    }
  } catch (error) {
    if (version !== requestVersion || error.name === 'AbortError') return;
    pageView.updateState({ loading: false, error: 'We could not load this page. Check your connection and try again.' });
  } finally { if (version === requestVersion) attrs(target, { 'aria-busy': 'false' }); }
}

function tokenRows(theme, overrides = {}) {
  return tokenNames.map(key => ({ id: key, value: overrides[key] ?? defaults[theme][key] }));
}

function populateAdmin() {
  if (!config || !adminView) return;
  selectedTheme = config.theme;
  adminView.updateState({ authenticated: true, checking: false, password: '', theme: selectedTheme,
    settings: Object.entries(settingsLabels).map(([key, label]) => ({ id: key, label, value: config[key] })),
    tokens: tokenRows(selectedTheme, config.tokens), message: '' });
  accessibility();
}

async function loadAdmin(target) {
  const version = adminVersion;
  adminView = Admin(target, runtime);
  try {
    const session = await api('/admin/session');
    if (version !== adminVersion) return;
    csrf = session.csrf;
    if (!config) applyConfig(await api('/site'));
    if (version !== adminVersion) return;
    populateAdmin();
  } catch (error) {
    if (version !== adminVersion) return;
    adminView.updateState({ checking: false, authenticated: false, message: error.status === 401 ? '' : error.message });
  }
  accessibility();
}

function adminMessage(message, error = false) {
  adminView?.updateState({ message });
  attrs(root.querySelector('.admin-message'), { 'data-error': String(error) });
}

function readAdmin() {
  const next = { ...config, theme: selectedTheme, tokens: {} };
  for (const input of root.querySelectorAll('.setting-input')) next[input.name] = input.value.trim();
  for (const input of root.querySelectorAll('.token-input')) {
    const value = input.value.trim();
    if (value !== defaults[selectedTheme][input.name]) next.tokens[input.name] = value;
  }
  return next;
}

function validTokens(tokens) {
  for (const [key, value] of Object.entries(tokens)) {
    if (!tokenNames.includes(key) || !value || value.length > 300 || /[;{}<>\\]|url\s*\(|expression|@import/i.test(value)) throw new Error(`Invalid value for ${key}. Use a plain CSS value.`);
  }
}

async function busy(button, callback) {
  if (button.disabled) return;
  const version = adminVersion;
  button.disabled = true;
  attrs(button, { 'aria-busy': 'true' });
  try { await callback(); }
  catch (error) { if (version === adminVersion) adminMessage(error.message, true); }
  finally { button.disabled = false; button.removeAttribute('aria-busy'); }
}

async function copy(text, button) {
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else {
      // Local fallback for browser environments without the async clipboard API.
      const selection = window.getSelection();
      const previous = selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
      const node = button.querySelector('.command-text') || button.closest('.code-block')?.querySelector('p');
      if (!node) throw new Error('Clipboard unavailable');
      const range = document.createRange(); range.selectNodeContents(node);
      selection.removeAllRanges(); selection.addRange(range);
      const succeeded = document.execCommand('copy');
      selection.removeAllRanges(); if (previous) selection.addRange(previous);
      if (!succeeded) throw new Error('Clipboard unavailable');
    }
    if (button.matches('.copy-code')) {
      const label = button.querySelector('.copy-code-label');
      const icon = button.querySelector('.copy-code-icon');
      label.textContent = 'Copied!';
      icon.classList.add('is-copied');
      setTimeout(() => {
        if (!button.isConnected) return;
        label.textContent = 'Copy code';
        icon.classList.remove('is-copied');
      }, 2000);
    }
    else { app.updateState({ feedback: 'Copied!' }); clearTimeout(feedbackTimer); feedbackTimer = setTimeout(() => app.updateState({ feedback: '' }), 2500); }
  } catch {
    app.updateState({ feedback: 'Select the command and copy it manually.' });
  }
}

function external(url) {
  if (!url) { app.updateState({ notice: 'Site settings are still loading. Please retry the connection.' }); return; }
  window.open(url, '_blank', 'noopener,noreferrer');
}

root.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  const navigation = [...routeNames].find(page => button.classList.contains(`nav-${page}`));
  if (navigation) { void route(navigation, true, true); return; }
  if (button.matches('.skip-content')) { root.querySelector('.view-container').focus(); return; }
  if (button.matches('.section-link')) {
    const links = [...root.querySelectorAll('.section-link')];
    const index = links.indexOf(button);
    const section = root.querySelectorAll('.content-section')[index];
    if (!section?.id) return;
    for (const link of links) link.removeAttribute('aria-current');
    attrs(button, { 'aria-current': 'location' });
    history.replaceState(history.state, '', `${window.location.pathname}#${encodeURIComponent(section.id)}`);
    section.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    return;
  }
  if (button.matches('.button-docs')) { void route('docs', true, true); return; }
  if (button.matches('.button-install')) { void route('docs', true, true); return; }
  if (button.matches('.github-button')) { external(config?.github_url); return; }
  if (button.matches('.open-npm')) { external(config?.npm_url); return; }
  if (button.matches('.open-admin')) { void route('admin', true, true); return; }
  if (button.matches('.retry-site')) { void loadSite(); return; }
  if (button.matches('.retry-page')) { void route(activePage); return; }
  if (button.matches('.terminal-command')) { void copy(config?.install_command || 'npm install qbits', button); return; }
  if (button.matches('.copy-code')) { void copy(button.closest('.code-block').querySelector('p').textContent, button); return; }
  if (button.matches('.admin-login')) {
    void busy(button, async () => {
      const version = adminVersion;
      const result = await api('/admin/login', { method: 'POST', body: JSON.stringify({ password: root.querySelector('.password-input').value }) });
      if (version !== adminVersion) return;
      csrf = result.csrf;
      if (!config) applyConfig(await api('/site'));
      if (version === adminVersion) populateAdmin();
    }); return;
  }
  if (button.matches('.admin-logout')) {
    void busy(button, async () => {
      const version = adminVersion;
      await api('/admin/logout', { method: 'POST' }); csrf = '';
      if (version !== adminVersion) return;
      adminView.updateState({ authenticated: false, password: '', message: 'You are signed out.' });
      applyTheme(config.theme, config.tokens); previewing = false;
    }); return;
  }
  if (button.matches('.admin-save')) {
    void busy(button, async () => {
      const version = adminVersion;
      const next = readAdmin(); validTokens(next.tokens);
      const saved = await api('/admin/site', { method: 'PUT', body: JSON.stringify(next) });
      applyConfig(saved); previewing = false;
      if (version === adminVersion) adminMessage('Saved. Your changes are live on this server.');
    }); return;
  }
  if (button.matches('.admin-preview')) {
    try { const next = readAdmin(); validTokens(next.tokens); applyTheme(next.theme, next.tokens); previewing = true; adminMessage('Preview active. Save changes to make this theme public.'); }
    catch (error) { adminMessage(error.message, true); }
    return;
  }
  if (button.matches('.admin-discard')) { applyTheme(config.theme, config.tokens); previewing = false; populateAdmin(); adminMessage('Unsaved changes discarded.'); return; }
  if (button.matches('.reset-tokens')) { adminView.updateState({ tokens: tokenRows(selectedTheme), message: 'Overrides reset. Save changes to apply.' }); return; }
  const theme = themeNames.find(name => button.classList.contains(`theme-${name}`));
  if (theme) { selectedTheme = theme; adminView.updateState({ theme, tokens: tokenRows(theme), message: 'Theme selected. Preview or save to apply.' }); accessibility(); }
});

root.addEventListener('keydown', event => {
  if (event.key === 'Enter' && event.target.matches('.password-input')) { event.preventDefault(); root.querySelector('.admin-login')?.click(); }
});
window.addEventListener('popstate', () => { void route(pathPage(), false, true); });
window.addEventListener('pagehide', () => { pageRequest?.abort(); sectionScrollCleanup?.(); clearTimeout(feedbackTimer); observer.disconnect(); quantum.dispose(); frameArt.dispose(); pageView?.(); adminView?.(); app(); }, { once: true });
accessibility();
window.addEventListener('resize', updateNavIndicator);
document.fonts.ready.then(updateNavIndicator);
void route(pathPage());
void loadSite();
