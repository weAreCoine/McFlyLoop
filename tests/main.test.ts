import { execa } from 'execa';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const mainPath = fileURLToPath(new URL('../src/main.ts', import.meta.url));

async function runCli(args: string[]) {
  return execa(process.execPath, ['--import', 'tsx', mainPath, ...args], {
    reject: false,
    cwd: repoRoot,
  });
}

const phrases = [
  'Warming up the time circuits...',
  "Roads? Where we're going, we don't need roads.",
  'Great Scott!',
  'The flux capacitor is fluxing.',
  'Setting destination time...',
];

test('mcfly fly prints one of the five phrases on stdout and exits 0', async () => {
  const result = await runCli(['fly']);

  expect(result.exitCode).toBe(0);
  expect(phrases).toContain(result.stdout);
  expect(result.stderr).toBe('');
});

test('mcfly without a subcommand prints usage on stderr and exits 1', async () => {
  const result = await runCli([]);

  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain('Usage: mcfly');
  expect(result.stdout).toBe('');
});

test('mcfly with an unknown command reports it on stderr and exits 1', async () => {
  const result = await runCli(['foo']);

  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain("error: unknown command 'foo'");
  expect(result.stderr).toContain('(add --help for additional information)');
  expect(result.stdout).toBe('');
});

test('mcfly --help prints the program help on stdout and exits 0', async () => {
  const result = await runCli(['--help']);

  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain('Usage: mcfly');
  expect(result.stdout).toContain('Start a trip (scaffold, does nothing yet)');
  expect(result.stderr).toBe('');
});

test('mcfly fly with an extra argument reports too many arguments and exits 1', async () => {
  const result = await runCli(['fly', 'extra']);

  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain('too many arguments');
  expect(result.stdout).toBe('');
});
