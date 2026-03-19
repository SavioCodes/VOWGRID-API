import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

function quoteArg(argument) {
  return /[\s"]/u.test(argument) ? `"${argument.replaceAll('"', '\\"')}"` : argument;
}

function run(command, args, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      windowsHide: true,
      ...options,
    });

    child.on('error', rejectPromise);
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise(undefined);
        return;
      }

      rejectPromise(
        new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}.`),
      );
    });
  });
}

function runPnpm(args, options = {}) {
  if (process.platform === 'win32') {
    const commandLine = `pnpm ${args.map(quoteArg).join(' ')}`;
    return run(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', commandLine], options);
  }

  return run('pnpm', args, options);
}

const root = process.cwd();
const sdkDirectory = resolve(root, 'packages', 'sdk');
const packDestination = resolve(root, 'test-results', 'sdk-pack');

mkdirSync(packDestination, { recursive: true });

await runPnpm(['build'], { cwd: sdkDirectory });
await runPnpm(['pack', '--pack-destination', packDestination], {
  cwd: sdkDirectory,
});
