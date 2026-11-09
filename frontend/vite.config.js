import { defineConfig } from 'vite';
import { languagePlugin } from 'qbits/vite';
import { readFileSync } from 'node:fs';

// Native CSS variables cannot be used in media conditions. Expand the same
// centrally configured breakpoint tokens for both development and production.
const themeBreakpoints = {
  postcssPlugin: 'qbits-theme-breakpoints',
  AtRule: {
    media(rule) {
      const tokens = readFileSync(new URL('./src/themes/tokens.css', import.meta.url), 'utf8');
      rule.params = rule.params.replace(/\(--(above-)?(tablet|mobile|compact)\)/g, (_, above, name) => {
        const value = tokens.match(new RegExp(`--breakpoint-${name}:\\s*([^;]+);`))?.[1];
        if (!value) throw new Error(`Missing breakpoint token: ${name}`);
        return above ? `(width > ${value})` : `(max-width: ${value})`;
      });
    },
  },
};

export default defineConfig({
  plugins: [languagePlugin()],
  css: { postcss: { plugins: [themeBreakpoints] } },
  server: {
    port: 5188,
    strictPort: true,
    proxy: { '/api': process.env.QBITS_API_TARGET || 'http://127.0.0.1:8108' },
  },
  build: { target: 'es2022', sourcemap: false },
});
