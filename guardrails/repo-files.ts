import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ignoredDirectories = new Set([
  ".git",
  ".expo",
  "build",
  "coverage",
  "dist",
  "node_modules",
]);

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function fromRoot(...parts: string[]): string {
  return join(repoRoot, ...parts);
}

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function readUtf8(path: string): string {
  return readFileSync(path, "utf8");
}

export function repoRelative(path: string): string {
  return relative(repoRoot, path);
}

export function walkFiles(
  root: string,
  extensions?: ReadonlySet<string>,
): string[] {
  if (!existsSync(root)) {
    return [];
  }

  const files: string[] = [];

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...walkFiles(path, extensions));
      }
      continue;
    }

    if (!extensions || [...extensions].some((extension) => entry.name.endsWith(extension))) {
      files.push(path);
    }
  }

  return files.sort();
}
