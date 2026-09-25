import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const skippedDirs = new Set(['node_modules', 'ios', 'android', 'build', 'dist', 'evidence', '.expo', 'Pods', '.git']);

export const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs'];

export function walk(dir: string, extensions: readonly string[] = codeExtensions): string[] {
  const found: string[] = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skippedDirs.has(entry.name)) found.push(...walk(path, extensions));
    } else if (entry.isFile() && extensions.includes(extname(entry.name))) {
      found.push(path);
    }
  }
  return found;
}

export const read = (path: string) => readFileSync(path, 'utf8');

export function importsModule(source: string, specifier: RegExp): boolean {
  const pattern = new RegExp(
    String.raw`(?:from\s+|import\s*\(\s*|require\s*\(\s*|^\s*import\s+)['"](${specifier.source})['"]`,
    'm',
  );
  return pattern.test(source);
}

export function lineOf(source: string, index: number): number {
  return source.slice(0, index).split('\n').length;
}
