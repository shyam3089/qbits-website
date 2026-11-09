import { defineConfig } from 'vite';
import { languagePlugin } from 'qbits/vite';
import { readFileSync } from 'node:fs';

// Native CSS variables cannot be used in media conditions. Expand the same
// centrally configured breakpoint tokens for both development and production.
const themeBreakpoints = {
  name: 'qbits-theme-breakpoints',
  enforce: 'pre',
  transform(source, id) {
    if (!id.endsWith('.css')) return;
    const tokens = readFileSync(new URL('./src/themes/tokens.css', import.meta.url), 'utf8');
    return source.replace(/@media\s*\(--(tablet|mobile|compact)\)/g,
      (_, name) => {
        const value = tokens.match(new RegExp(`--breakpoint-${name}:\\s*([^;]+);`))?.[1];
        if (!value) throw new Error(`Missing breakpoint token: ${name}`);
        return `@media (max-width: ${value})`;
      });
  },
};

export default defineConfig({
  plugins: [themeBreakpoints, languagePlugin()],
  server: {
    port: 5188,
    strictPort: true,
    proxy: { '/api': process.env.QBITS_API_TARGET || 'http://127.0.0.1:8108' },
  },
  build: { target: 'es2022', sourcemap: false },
});
