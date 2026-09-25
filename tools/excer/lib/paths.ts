import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const appRoot = join(repoRoot, 'app-next');
export const serverRoot = join(repoRoot, 'server');
export const featuresDir = join(repoRoot, '.agents', 'skills', 'verify-excerlock', 'references', 'features');
export const scenariosDir = join(appRoot, 'src', 'demo', 'scenarios');
export const routesDir = join(appRoot, 'app');

export const fromRoot = (...parts: string[]) => join(repoRoot, ...parts);
export const rel = (path: string) => relative(repoRoot, path);

export function stateDir(...parts: string[]): string {
  const dir = join(repoRoot, '.excer', ...parts);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export const timestamp = () => new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
