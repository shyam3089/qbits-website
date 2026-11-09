import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const root = fileURLToPath(new URL('..', import.meta.url));
const dataDir = mkdtempSync(join(tmpdir(), 'qbits-website-e2e-'));
const venvPython = join(root, '.venv', 'Scripts', 'python.exe');
const python = existsSync(venvPython) ? `"${venvPython}"` : 'python';
mkdirSync(join(root, 'artifacts'), { recursive: true });

export default defineConfig({
  testDir: './tests', fullyParallel: false, workers: 1,
  reporter: [['list']], timeout: 25000,
  use: { baseURL: 'http://127.0.0.1:8118', browserName: 'firefox', viewport: { width: 1254, height: 775 }, contextOptions: { reducedMotion: 'reduce' }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: {
    command: `${python} -m uvicorn backend.main:app --host 127.0.0.1 --port 8118 --log-level warning`,
    cwd: root, url: 'http://127.0.0.1:8118/api/health', reuseExistingServer: false,
    env: { QBITS_ADMIN_PASSWORD: 'e2e-fixture-only', QBITS_DATA_DIR: dataDir },
  },
});
