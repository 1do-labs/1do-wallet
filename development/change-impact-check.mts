import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const option = (name: string) =>
  args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const planOnly = args.includes('--plan');
const quick = args.includes('--quick');
const staged = args.includes('--staged');
const base = option('base');
const explicitFiles = option('files');
const root = resolve(import.meta.dirname, '..');
const run = (command: string, commandArgs: string[], capture = false) => {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
  });
  if (result.error || result.status !== 0) {
    if (capture) process.stderr.write(result.stderr || '');
    throw (
      result.error || new Error(`${command} ${commandArgs.join(' ')} failed`)
    );
  }
  return result.stdout || '';
};
const gitFiles = (...gitArgs: string[]) =>
  run('git', gitArgs, true).split('\0').filter(Boolean);

let files: string[];
try {
  if (explicitFiles) {
    files = explicitFiles.split(',').filter(Boolean);
  } else if (base) {
    files = gitFiles('diff', '--name-only', '-z', base, 'HEAD');
  } else if (staged) {
    files = gitFiles('diff', '--cached', '--name-only', '-z');
  } else {
    files = [
      ...gitFiles('diff', '--name-only', '-z'),
      ...gitFiles('diff', '--cached', '--name-only', '-z'),
      ...gitFiles('ls-files', '--others', '--exclude-standard', '-z'),
    ];
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
files = [...new Set(files)].sort();
if (staged) run('git', ['diff', '--cached', '--check']);
const has = (pattern: RegExp) => files.some((file) => pattern.test(file));
const commands = new Map<string, [string, string[]]>();
const add = (label: string, command: string, commandArgs: string[]) =>
  commands.set(label, [command, commandArgs]);

if (files.length) {
  add('agent rules and diff', 'yarn', ['agent:check']);
  const protocol = has(
    /^(shared\/lib\/eip7702|shared\/lib\/typed-signature|ui\/pages\/confirmations\/|app\/scripts\/controllers\/)/u,
  );
  const ui = has(/^ui\//u);
  const config = has(/^(package\.json|yarn\.lock|\.github\/|development\/)/u);
  if (ui || protocol || config) {
    add('changed-file lint', 'yarn', ['lint:changed']);
  }
  if ((protocol || config) && !quick) {
    add('TypeScript', 'yarn', ['lint:tsc']);
  }
  if (protocol && !quick) {
    const tests = [
      'ui/pages/confirmations/utils/onedo-clear-signing.test.ts',
      'shared/lib/eip7702-utils.test.ts',
      'shared/lib/typed-signature.test.ts',
    ];
    add('signing tests', 'yarn', ['test:unit', ...tests, '--runInBand']);
    if (existsSync(resolve(root, '..', '1do-core'))) {
      add('Wallet/Core alignment', 'npm', [
        'run',
        'wallet:core:check',
        '--prefix',
        '../1do-core',
      ]);
    } else {
      console.log(
        'Core checkout unavailable: run wallet:core:check when both repositories are present',
      );
    }
  }
}
console.log(
  `Wallet changed files (${files.length}): ${files.join(', ') || '(none)'}`,
);
for (const [label, [command, commandArgs]] of commands) {
  console.log(`- ${label}: ${command} ${commandArgs.join(' ')}`);
  if (!planOnly) {
    try {
      run(command, commandArgs);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }
}
