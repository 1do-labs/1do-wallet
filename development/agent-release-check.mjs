#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const requiredFiles = [
  'AGENTS.md',
  'package.json',
  'app/manifest',
  '.agents/skills/cross-repo-wallet-core-change/SKILL.md',
  '.agents/skills/eip712-7702-change/SKILL.md',
];
const missing = requiredFiles.filter((file) => !existsSync(file));
if (missing.length) {
  console.error(`agent-release-check: missing ${missing.join(', ')}`);
  process.exit(1);
}

const diffCheck = spawnSync('git', ['diff', '--check'], { encoding: 'utf8' });
if (diffCheck.status !== 0) {
  process.stderr.write(diffCheck.stderr || diffCheck.stdout);
  process.exit(diffCheck.status || 1);
}
console.log('agent-release-check: Wallet rules, skills, and diff checks passed');
