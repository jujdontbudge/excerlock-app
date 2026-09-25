import { spawnSync, type SpawnSyncOptions } from 'node:child_process';
import { repoRoot } from './paths.ts';

export type RunResult = { code: number; stdout: string; stderr: string };

export function run(command: string, args: readonly string[], options: SpawnSyncOptions = {}): RunResult {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    ...options,
  });
  return {
    code: result.status ?? (result.error ? 127 : 1),
    stdout: String(result.stdout ?? ''),
    stderr: String(result.stderr ?? result.error?.message ?? ''),
  };
}

export function must(command: string, args: readonly string[], options: SpawnSyncOptions = {}): string {
  const result = run(command, args, options);
  if (result.code !== 0) throw new Error(`${command} ${args.join(' ')} failed (${result.code}): ${tail(result.stderr || result.stdout, 12)}`);
  return result.stdout;
}

export const has = (command: string) => run('/bin/sh', ['-c', `command -v ${command}`]).code === 0;

export function tail(text: string, lines: number): string {
  return text.trimEnd().split('\n').slice(-lines).join('\n');
}

export const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

export class UsageError extends Error {}

export type Out = { ok(line: string): void; fail(line: string): void; info(line: string): void; detail(text: string): void };

export const out: Out = {
  ok: (line) => console.log(`✓ ${line}`),
  fail: (line) => console.log(`✗ ${line}`),
  info: (line) => console.log(`  ${line}`),
  detail: (text) => {
    const lines = text.trimEnd().split('\n');
    for (const line of lines.slice(0, 25)) console.log(`    ${line}`);
    if (lines.length > 25) console.log(`    … ${lines.length - 25} more lines`);
  },
};

export function flag(args: string[], name: string): boolean {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return false;
  args.splice(index, 1);
  return true;
}

export function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (value === undefined || value.startsWith('--')) throw new UsageError(`--${name} needs a value`);
  args.splice(index, 2);
  return value;
}
