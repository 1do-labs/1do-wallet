import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const repoRoot = process.cwd();
const sourceExtension = join(repoRoot, 'dist', 'chrome');
if (!existsSync(join(sourceExtension, 'manifest.json'))) {
  throw new Error('Extension not built. Run yarn build:test:dev first.');
}

const windowsRoot = '/mnt/c/Temp/1do-wallet-mcp';
const windowsExtension = join(windowsRoot, 'dist-chrome');
const windowsProfile = join(windowsRoot, 'chrome-profile');
mkdirSync(windowsRoot, { recursive: true });
rmSync(windowsExtension, { recursive: true, force: true });
cpSync(sourceExtension, windowsExtension, { recursive: true });

const toWindowsPath = (value) => {
  const result = spawnSync('wslpath', ['-w', value], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`wslpath failed: ${result.stderr}`);
  return result.stdout.trim();
};

const extensionPath = toWindowsPath(windowsExtension);
const profilePath = toWindowsPath(windowsProfile);
const chromePath = process.env.ONEDO_WINDOWS_CHROME ?? '';
const powershell = [
  '$ErrorActionPreference = "Stop";',
  `$candidates = @(${chromePath ? JSON.stringify(chromePath) + ',' : ''}'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe','C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',"$env:LOCALAPPDATA\\Google\\Chrome\\Application\\chrome.exe");`,
  '$chrome = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1;',
  'if (-not $chrome) { throw "Chrome executable not found. Set ONEDO_WINDOWS_CHROME."; }',
  `$chromeArgs = @('--no-first-run','--no-default-browser-check','--remote-debugging-port=9222','--remote-debugging-address=0.0.0.0','--user-data-dir=${profilePath}','--disable-extensions-except=${extensionPath}','--load-extension=${extensionPath}');`,
  'Start-Process -FilePath $chrome -ArgumentList $chromeArgs -PassThru | Select-Object -ExpandProperty Id;',
].join(' ');
const launched = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', powershell], { encoding: 'utf8' });
if (launched.status !== 0) throw new Error(launched.stderr || launched.stdout || 'Unable to start Windows Chrome');

const cdpUrls = [process.env.ONEDO_WINDOWS_CDP_URL ?? 'http://127.0.0.1:9222'];
try {
  const nameserver = readFileSync('/etc/resolv.conf', 'utf8').match(/^nameserver\s+([^\s]+)/mu)?.[1];
  if (nameserver) cdpUrls.push(`http://${nameserver}:9222`);
} catch {
  // Native Windows environments do not have /etc/resolv.conf.
}
const deadline = Date.now() + 30_000;
let browser;
while (!browser && Date.now() < deadline) {
  for (const cdpUrl of cdpUrls) {
    try {
      browser = await chromium.connectOverCDP(cdpUrl);
      break;
    } catch {
      // Try the next WSL/Windows route.
    }
  }
  if (!browser) await new Promise((resolve) => setTimeout(resolve, 500));
}
if (!browser) throw new Error(`Windows Chrome CDP did not become available. Tried: ${cdpUrls.join(', ')}. Check Chrome path, port 9222, and Windows firewall.`);

try {
  const serviceWorker = browser.contexts().flatMap((context) => context.serviceWorkers())[0];
  if (!serviceWorker) throw new Error('1Do Wallet service worker was not loaded');
  const extensionId = new URL(serviceWorker.url()).host;
  const manifest = JSON.parse(readFileSync(join(sourceExtension, 'manifest.json'), 'utf8'));
  if (!manifest.permissions?.includes('nativeMessaging')) throw new Error('nativeMessaging permission is missing');
  console.log(JSON.stringify({ status: 'ok', extensionId, serviceWorker: serviceWorker.url(), browser: 'windows-chrome-cdp' }, null, 2));
} finally {
  await browser.close();
}
