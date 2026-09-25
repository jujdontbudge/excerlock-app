import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { appRoot, fromRoot } from '../lib/paths.ts';
import { run } from '../lib/shell.ts';
import { verdict, type Check } from './types.ts';

type Lockfile = { packages: Record<string, { version?: string }> };

const lockfiles = (): [string, Lockfile][] =>
  ['package-lock.json', 'server/package-lock.json']
    .filter((path) => existsSync(fromRoot(path)))
    .map((path) => [path, JSON.parse(readFileSync(fromRoot(path), 'utf8')) as Lockfile]);

function atLeast(version: string, minimum: string): boolean {
  const a = version.split(/[.-]/).map(Number);
  const b = minimum.split('.').map(Number);
  for (let index = 0; index < b.length; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference > 0;
  }
  return true;
}

type Floor = { name: string; minimum: (version: string) => string | null; reason: string };

const floors: Floor[] = [
  { name: 'decode-uri-component', minimum: () => '0.5.0', reason: 'URL parsing DoS' },
  { name: 'fast-uri', minimum: (v) => ({ 3: '3.1.8', 4: '4.2.1' } as Record<string, string>)[v.split('.')[0] ?? ''] ?? null, reason: 'host confusion' },
  { name: 'nanoid', minimum: () => '3.3.18', reason: 'zero-size loop' },
  { name: 'jayson', minimum: () => '5.0.0', reason: 'quadratic stream-json parser' },
  { name: 'uuid', minimum: () => '11.0.0', reason: 'v3/v5/v6 buffer bounds' },
  { name: 'esbuild', minimum: () => '0.25.0', reason: 'development server request forgery' },
];

const banned = [{ name: 'stream-json', reason: 'quadratic parser reachable from jayson' }];

export const dependencyFloors: Check = {
  name: 'dependency-floors',
  why: 'Locked copies of known-vulnerable packages stay at or above their patched releases.',
  tier: 'static',
  run() {
    const problems: string[] = [];
    for (const [label, lock] of lockfiles()) {
      for (const [path, info] of Object.entries(lock.packages)) {
        const version = info.version ?? '';
        for (const floor of floors) {
          if (!path.endsWith(`node_modules/${floor.name}`)) continue;
          const minimum = floor.minimum(version);
          if (minimum && !atLeast(version, minimum)) problems.push(`${label}: ${path}@${version} < ${minimum} (${floor.reason})`);
        }
        for (const item of banned)
          if (path.endsWith(`node_modules/${item.name}`)) problems.push(`${label}: ${path}@${version} is banned (${item.reason})`);
      }
    }
    return verdict(problems);
  },
};

function manifestPath(name: string, from: string): string {
  const require = createRequire(from);
  try {
    return require.resolve(`${name}/package.json`);
  } catch {
    let dir = dirname(require.resolve(name));
    while (dir !== dirname(dir)) {
      const candidate = join(dir, 'package.json');
      if (existsSync(candidate) && (JSON.parse(readFileSync(candidate, 'utf8')) as { name?: string }).name === name) return candidate;
      dir = dirname(dir);
    }
    throw new Error(`cannot resolve ${name} from ${from}`);
  }
}

export const sentryCore: Check = {
  name: 'sentry-core',
  why: 'The mobile Sentry SDK resolves exactly one physical @sentry/core at one exact version (ADR 0020).',
  tier: 'static',
  run() {
    type Manifest = { name: string; dependencies?: Record<string, string> };
    const pending = [manifestPath('@sentry/react-native', join(appRoot, 'package.json'))];
    const seen = new Set<string>();
    const cores = new Map<string, string[]>();
    const problems: string[] = [];
    while (pending.length > 0) {
      const path = realpathSync(pending.pop() ?? '');
      if (seen.has(path)) continue;
      seen.add(path);
      const manifest = JSON.parse(readFileSync(path, 'utf8')) as Manifest;
      for (const [dependency, range] of Object.entries(manifest.dependencies ?? {})) {
        if (dependency === '@sentry/core') {
          if (!/^\d+\.\d+\.\d+$/.test(range)) problems.push(`${manifest.name} declares @sentry/core ${range}, not an exact version`);
          const core = realpathSync(manifestPath('@sentry/core', path));
          cores.set(core, [...(cores.get(core) ?? []), manifest.name]);
        } else if (dependency.startsWith('@sentry/') || dependency.startsWith('@sentry-internal/')) {
          pending.push(manifestPath(dependency, path));
        }
      }
    }
    if (cores.size !== 1)
      problems.push(`found ${cores.size} physical @sentry/core copies: ${[...cores].map(([path, owners]) => `${path} (${owners.join(', ')})`).join('; ')}`);
    return verdict(problems, [...cores.keys()].map((path) => (JSON.parse(readFileSync(path, 'utf8')) as { version: string }).version).join());
  },
};

export const fixtureBuildEnv = {
  CI: '1',
  EXPO_PUBLIC_ADAPTY_KEY: 'fixture-adapty',
  EXPO_PUBLIC_POSTHOG_KEY: 'fixture-posthog',
  EXPO_PUBLIC_POSTHOG_HOST: 'https://us.i.posthog.com',
  SENTRY_DSN: 'https://public@example.com/1',
  EXPO_PUBLIC_SUPABASE_URL: 'https://fixture.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'fixture-anon',
  EXPO_PUBLIC_API_URL: 'https://api.example.com',
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: 'fixture.apps.googleusercontent.com',
};

export const publicConfigSecrets: Check = {
  name: 'public-config-secrets',
  why: 'SENTRY_AUTH_TOKEN never reaches the public Expo config for dev, preview or prod.',
  tier: 'full',
  run() {
    const sentinel = 'excer-check-private-token-must-not-export';
    const problems: string[] = [];
    for (const [profile, environment] of [['development', 'dev'], ['preview', 'preview'], ['production', 'prod']] as const) {
      const result = run('npx', ['expo', 'config', '--type', 'public', '--json'], {
        cwd: appRoot,
        env: { ...process.env, ...fixtureBuildEnv, EAS_BUILD_PROFILE: profile, EXCERLOCK_ENV: environment, SENTRY_AUTH_TOKEN: sentinel },
      });
      if (result.code !== 0) problems.push(`${profile}: expo config failed (output withheld)`);
      else if (result.stdout.includes(sentinel) || result.stdout.includes('SENTRY_AUTH_TOKEN'))
        problems.push(`${profile}: the public Expo config contains the Sentry auth token`);
    }
    return verdict(problems);
  },
};
