import { appRoot } from '../lib/paths.ts';
import { run, tail } from '../lib/shell.ts';
import { fixtureBuildEnv } from './dependencies.ts';
import { verdict, type Check } from './types.ts';

export const typecheck: Check = {
  name: 'typecheck',
  why: 'Every workspace compiles with strict TypeScript.',
  tier: 'static',
  run() {
    const result = run('npm', ['run', '-s', 'typecheck']);
    return verdict(result.code === 0 ? [] : [tail(result.stdout + result.stderr, 40)]);
  },
};

export const lint: Check = {
  name: 'lint',
  why: 'app-next passes its ESLint config with zero warnings.',
  tier: 'static',
  run() {
    const result = run('npx', ['expo', 'lint', '--max-warnings', '0'], { cwd: appRoot, env: { ...process.env, CI: '1' } });
    return verdict(result.code === 0 ? [] : [tail(result.stdout + result.stderr, 40)]);
  },
};

export const expoDependencies: Check = {
  name: 'expo-dependencies',
  why: 'Installed native dependencies match what Expo SDK 57 expects.',
  tier: 'full',
  run() {
    const result = run('npx', ['expo', 'install', '--check'], { cwd: appRoot, env: { ...process.env, CI: '1' } });
    return verdict(result.code === 0 ? [] : [tail(result.stdout + result.stderr, 30)]);
  },
};

export const releaseBundle: Check = {
  name: 'release-bundle',
  why: 'The iOS release bundle exports and carries no Linked Recorder research code (ADR 0027).',
  tier: 'full',
  run() {
    const exported = run('npx', ['expo', 'export', '--platform', 'ios', '--max-workers', '4', '--output-dir', 'dist'], {
      cwd: appRoot,
      env: { ...process.env, ...fixtureBuildEnv, NODE_ENV: 'production', EXCERLOCK_ENV: 'prod', EAS_BUILD_PROFILE: 'production' },
    });
    if (exported.code !== 0) return verdict([tail(exported.stdout + exported.stderr, 30)]);
    const scanned = run('node', ['scripts/verify-no-linked-trace.cjs', 'dist'], { cwd: appRoot });
    return verdict(scanned.code === 0 ? [] : [tail(scanned.stdout + scanned.stderr, 20)]);
  },
};
