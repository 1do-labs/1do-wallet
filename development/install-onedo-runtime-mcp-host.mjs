#!/usr/bin/env node
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { homedir, platform } from 'node:os';

const extensionId = process.argv[2];
if (!extensionId || !/^[a-p]{32}$/u.test(extensionId)) {
  console.error('用法：node development/install-onedo-runtime-mcp-host.mjs <32位 Chrome Extension ID>');
  process.exitCode = 2;
  process.exit();
}

const root = resolve(import.meta.dirname, '..');
const hostSource = resolve(root, 'development/onedo-runtime-mcp-host.ts');
const hostName = 'com.1do.wallet.mcp';
const hostDir = process.env.ONEDO_WALLET_MCP_HOST_DIR
  ? resolve(process.env.ONEDO_WALLET_MCP_HOST_DIR)
  : resolve(homedir(), '.local', 'share', '1do-wallet-mcp');
const manifestDir = process.env.CHROME_NATIVE_MESSAGING_DIR
  ? resolve(process.env.CHROME_NATIVE_MESSAGING_DIR)
  : platform() === 'darwin'
    ? resolve(homedir(), 'Library', 'Application Support', 'Google', 'Chrome', 'NativeMessagingHosts')
    : resolve(process.env.XDG_CONFIG_HOME ?? resolve(homedir(), '.config'), 'google-chrome', 'NativeMessagingHosts');
const wrapper = resolve(hostDir, '1do-runtime-mcp-host.sh');
const manifest = resolve(manifestDir, `${hostName}.json`);

mkdirSync(hostDir, { recursive: true });
mkdirSync(manifestDir, { recursive: true });
writeFileSync(wrapper, `#!/bin/sh\ncd ${JSON.stringify(root)}\nexec node --import tsx ${JSON.stringify(hostSource)}\n`, { mode: 0o700 });
chmodSync(wrapper, 0o700);
writeFileSync(manifest, `${JSON.stringify({
  name: hostName,
  description: '1Do Wallet MCP Native Messaging host',
  path: wrapper,
  type: 'stdio',
  allowed_origins: [`chrome-extension://${extensionId}/`],
}, null, 2)}\n`, { mode: 0o600 });
chmodSync(manifest, 0o600);
console.log(JSON.stringify({ host: wrapper, manifest, extensionId }, null, 2));
