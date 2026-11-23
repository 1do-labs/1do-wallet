import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect, chromium } from '@playwright/test';

const extensionPath = path.join(process.cwd(), 'dist', 'chrome');

test.describe('1Do Wallet Runtime MCP browser bridge', () => {
  test('loads the wallet extension and exposes the Native Messaging capability', async () => {
    test.skip(!existsSync(path.join(extensionPath, 'manifest.json')), 'Build the extension first with yarn build:test:dev');
    const manifest = JSON.parse(readFileSync(path.join(extensionPath, 'manifest.json'), 'utf8')) as {
      permissions?: string[];
      background?: { service_worker?: string };
    };
    expect(manifest.permissions).toContain('nativeMessaging');
    expect(manifest.background?.service_worker).toBeTruthy();

    const userDataDir = path.join(process.cwd(), 'test-artifacts', 'wallet-mcp-profile');
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      channel: 'chrome',
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--disable-background-timer-throttling',
      ],
    });
    try {
      const serviceWorker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
      const extensionId = new URL(serviceWorker.url()).host;
      expect(extensionId).toMatch(/^[a-p]{32}$/u);
      expect(serviceWorker.url()).toContain(manifest.background?.service_worker ?? 'service-worker');
      const extensionPage = await context.newPage();
      await extensionPage.goto(`chrome-extension://${extensionId}/home.html`);
      await expect(extensionPage).toHaveURL(new RegExp(`^chrome-extension://${extensionId}/`));
    } finally {
      await context.close();
    }
  });
});
