import { createRequire } from 'node:module';
import { join } from 'node:path';
import { appRoot, fromRoot, rel, repoRoot } from '../lib/paths.ts';
import { importsModule, lineOf, read, walk } from '../lib/files.ts';
import { run, tail } from '../lib/shell.ts';
import type { Check, CheckResult } from './types.ts';

const require = createRequire(join(repoRoot, 'package.json'));

type LintMessage = { ruleId: string | null; line: number };
type LintResult = { filePath: string; messages: LintMessage[] };
type ESLintInstance = { lintFiles(patterns: string[]): Promise<LintResult[]> };
type ESLintClass = new (options: object) => ESLintInstance;

export const commentRoots = ['app-next/app', 'app-next/src', 'app-next/modules', 'app-next/plugins', 'server/src', 'packages', 'tools/excer'];

export async function commentLinter(fix = false): Promise<ESLintInstance & { fix: boolean }> {
  const { ESLint } = require('eslint') as { ESLint: ESLintClass };
  const parser = require('@typescript-eslint/parser') as object;
  const excerlock = require(fromRoot('packages', 'eslint-plugin-excerlock', 'index.cjs')) as object;
  const linter = new ESLint({
    cwd: repoRoot,
    fix,
    overrideConfigFile: true,
    overrideConfig: [
      { ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/ios/**', '**/evidence/**', '**/*.d.ts'] },
      {
        files: ['**/*.{ts,tsx,js,jsx,cjs,mjs}'],
        languageOptions: { parser, parserOptions: { ecmaFeatures: { jsx: true } } },
        linterOptions: { reportUnusedDisableDirectives: 'off' },
        plugins: { excerlock },
        rules: { 'excerlock/no-comments': 'error' },
      },
    ],
  });
  return Object.assign(linter, { fix });
}

export const comments: Check = {
  name: 'no-comments',
  why: 'Knowledge lives in names, types, CONTEXT.md and ADRs, not comments (ADR 0045). Count may only fall.',
  tier: 'static',
  async run(): Promise<CheckResult> {
    const linter = await commentLinter();
    const results = await linter.lintFiles(commentRoots.map((root) => fromRoot(root)));
    const hits = results.flatMap((result) =>
      result.messages.filter((message) => message.ruleId === 'excerlock/no-comments').map((message) => `${rel(result.filePath)}:${message.line}`),
    );
    return { kind: 'count', ratchet: 'comments', value: hits.length, samples: hits };
  },
};

const uiSources = () =>
  [...walk(join(appRoot, 'src')), ...walk(join(appRoot, 'app'))].filter(
    (file) => /\.tsx?$/.test(file) && !/design-system\/(tokens|illustrationTokens)\.ts$/.test(file),
  );

function scan(pattern: RegExp, files: string[]): string[] {
  return files.flatMap((file) => {
    const source = read(file);
    return [...source.matchAll(pattern)].map((match) => `${rel(file)}:${lineOf(source, match.index ?? 0)} ${match[0].trim()}`);
  });
}

export const rawColours: Check = {
  name: 'raw-colours',
  why: 'Colours come from design-system tokens, never hex or rgb literals. Count may only fall.',
  tier: 'static',
  run() {
    const hits = scan(/(?<=['"`\s(,])#[0-9A-Fa-f]{3,8}\b|\brgba?\(/g, uiSources());
    return { kind: 'count', ratchet: 'raw-colours', value: hits.length, samples: hits };
  },
};

export const rawType: Check = {
  name: 'raw-type',
  why: 'Text uses type roles; no numeric fontSize, lineHeight or fontWeight literals. Count may only fall.',
  tier: 'static',
  run() {
    const hits = scan(/\b(fontSize|lineHeight|fontWeight)\s*:\s*['"]?\d[^,}\n]*/g, uiSources());
    return { kind: 'count', ratchet: 'raw-type', value: hits.length, samples: hits };
  },
};

export const illustrationTokens: Check = {
  name: 'illustration-tokens',
  why: 'Only artwork reads illustrationTokens; UI chrome uses tokens.ts. Count of importers may only fall.',
  tier: 'static',
  run() {
    const hits = uiSources()
      .filter((file) => importsModule(read(file), /[./]*(?:design-system\/)?illustrationTokens/))
      .map(rel);
    return { kind: 'count', ratchet: 'illustration-token-importers', value: hits.length, samples: hits };
  },
};

type Cruise = { summary: { violations: { rule: { name: string }; from: string; to: string }[] } };

export const dependencyRules: Check = {
  name: 'dependency-rules',
  why: 'Imports follow the ARCHITECTURE.md layers and package boundaries (app-next/.dependency-cruiser.cjs). Count may only fall.',
  tier: 'static',
  run(): CheckResult {
    const result = run('npx', ['depcruise', 'src', 'app', '--config', '.dependency-cruiser.cjs', '--output-type', 'json'], { cwd: appRoot });
    if (!result.stdout.trim().startsWith('{')) return { kind: 'fail', problems: [tail(result.stdout + result.stderr, 20)] };
    const hits = (JSON.parse(result.stdout) as Cruise).summary.violations.map((violation) => `${violation.rule.name}: ${violation.from} -> ${violation.to}`);
    return { kind: 'count', ratchet: 'dependency-rules', value: hits.length, samples: hits };
  },
};
