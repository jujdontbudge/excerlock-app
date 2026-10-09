import { spawnSync } from 'node:child_process';
import { appRoot, fromRoot, repoRoot } from '../lib/paths.ts';
import { flag, must, option, out, run, UsageError } from '../lib/shell.ts';

export const shipProofs = [
  ['launch', 'first-launch-welcome'],
  ['launch', 'subscriber-opens-home'],
  ['launch', 'every-tab-opens'],
] as const;

export const help = `excer ota --message "<what changed>" [--publish]

The only way to publish a production OTA update (docs/ota.md). Refuses unless:
  1. nothing that goes into the bundle is uncommitted, and HEAD is origin/main;
  2. excer check passes, plus the release-bundle export and public-config-secrets
     (expo-dependencies is skipped: an OTA must not change native dependencies);
  3. the ship proofs pass on the simulator: a fresh install opens Welcome, a
     subscriber opens Home, and Home, Conditions, Analytics and Settings all open
     for a signed-in account. The dev fakes for class-backed ports (auth,
     subscription) throw on detached method calls, as the device does.
Without --publish it stops after the gate. With --publish it publishes under the
release lock and tags ota-runtime<version>-<date>-<sha>. Publishing still needs
the owner's go-ahead in the conversation.`;

const bundleInputs = ['app', 'src', 'modules', 'plugins', 'assets', 'config', 'patches', 'app.config.ts', 'app.json', 'index.js', 'babel.config.js', 'metro.config.js', 'package.json', 'eas.json'].map((path) => `app-next/${path}`);

const bundleInputDirt = () =>
  must('git', ['status', '--porcelain', '--', ...bundleInputs, 'packages', 'package-lock.json'])
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3))
    .filter((path) => !path.endsWith('.md'));

const step = (command: string, args: string[], cwd = repoRoot) => spawnSync(command, args, { cwd, stdio: 'inherit' }).status === 0;

export async function otaCommand(args: string[]): Promise<number> {
  const publish = flag(args, 'publish');
  const message = option(args, 'message');
  if (args.length > 0) throw new UsageError(`unexpected arguments: ${args.join(' ')}`);
  if (!message) throw new UsageError('--message is required');

  const dirt = bundleInputDirt();
  if (dirt.length > 0) {
    out.fail(`uncommitted bundle inputs; commit or set them aside first:\n    ${dirt.slice(0, 20).join('\n    ')}`);
    return 1;
  }
  must('git', ['fetch', '--quiet', 'origin', 'main']);
  const head = must('git', ['rev-parse', 'HEAD']).trim();
  const remote = must('git', ['rev-parse', 'origin/main']).trim();
  if (head !== remote) {
    out.fail(`HEAD ${head.slice(0, 8)} is not origin/main ${remote.slice(0, 8)}; ship only what is on main`);
    return 1;
  }
  out.ok(`bundle inputs clean at ${head.slice(0, 8)} (origin/main)`);

  if (!step(fromRoot('excer'), ['check']) || !step(fromRoot('excer'), ['check', '--only', 'public-config-secrets,release-bundle'])) {
    out.fail('excer check failed; not shipping');
    return 1;
  }
  for (const [feature, proof] of shipProofs) {
    if (!step(fromRoot('excer'), ['prove', feature, '--proof', proof])) {
      out.fail(`ship proof ${feature}/${proof} failed; not shipping`);
      return 1;
    }
  }
  out.ok('ship gate passed');
  if (!publish) {
    out.info('dry run: add --publish to publish this commit');
    return 0;
  }

  const sha = head.slice(0, 8);
  const published = run(
    'python3',
    [fromRoot('scripts', 'agent-ops.py'), 'run', '--', 'npx', 'eas-cli', 'update', '--branch', 'production', '--environment', 'production', '--platform', 'ios', '--non-interactive', '--message', `${sha} ${message}`],
    { cwd: appRoot },
  );
  process.stdout.write(published.stdout.split('\n').slice(-12).join('\n') + '\n');
  if (published.code !== 0) {
    out.fail(`eas update failed (${published.code}):\n${published.stderr.split('\n').slice(-12).join('\n')}`);
    return 1;
  }
  const runtime = /Runtime version\s+(\S+)/.exec(published.stdout)?.[1] ?? 'unknown';
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const tag = `ota-runtime${runtime}-${date}-${sha}`;
  run('git', ['tag', tag, head]);
  out.ok(`published ${sha}; tagged ${tag} locally`);
  return 0;
}
