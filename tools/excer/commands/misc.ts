import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { appRoot, rel } from '../lib/paths.ts';
import { flag, has, option, out, run, UsageError } from '../lib/shell.ts';
import { appCandidates, devices, metroPort, metroRunning } from '../lib/sim.ts';
import { serverSmokeCommand, serverSmokeHelp } from './serverSmoke.ts';

export const serverHelp = `excer server health|ready [--prod] [--url <base>]
excer server smoke [--keep]

Calls GET /v1/health (process up) or /v1/ready (database reachable). Health alone
does not prove readiness. Default base http://127.0.0.1:3000; --prod uses
https://api.excerlock.com. Start a local server with: npm run dev -w server

${serverSmokeHelp}`;

export async function serverCommand(args: string[]): Promise<number> {
  const prod = flag(args, 'prod');
  const base = option(args, 'url') ?? (prod ? 'https://api.excerlock.com' : 'http://127.0.0.1:3000');
  const [probe] = args;
  if (probe === 'smoke') return serverSmokeCommand(args.slice(1));
  if (probe !== 'health' && probe !== 'ready') throw new UsageError(serverHelp);
  try {
    const response = await fetch(`${base}/v1/${probe}`, { signal: AbortSignal.timeout(10_000) });
    const body = await response.text();
    (response.ok ? out.ok : out.fail)(`${base}/v1/${probe} → ${response.status}`);
    out.detail(body);
    return response.ok ? 0 : 1;
  } catch (error) {
    out.fail(`${base}/v1/${probe} unreachable: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

export const doctorHelp = `excer doctor

Checks this machine can run excer: Node, the iOS toolchain, idb, the owned
simulator, a reusable build, Metro and the service CLIs.`;

export async function doctorCommand(): Promise<number> {
  let failures = 0;
  const report = (ok: boolean, line: string, fix?: string) => {
    (ok ? out.ok : out.fail)(line);
    if (!ok && fix) out.info(`fix: ${fix}`);
    if (!ok) failures += 1;
  };
  const major = Number(process.versions.node.split('.')[0]);
  report(major >= 26, `node ${process.versions.node}`, 'install Node 26 (type stripping runs excer without a build)');
  report(existsSync(join(appRoot, 'node_modules')) || existsSync(join(appRoot, '..', 'node_modules')), 'dependencies installed', 'npm install');
  report(run('xcrun', ['simctl', 'help']).code === 0, 'xcrun simctl', 'install Xcode and run xcode-select');
  report(has('idb'), 'idb', 'pip install fb-idb and brew install idb-companion');
  const wanted = process.env.EXCER_SIM ?? 'ExcerLock-Next';
  let simOk = false;
  try {
    simOk = devices().some((device) => device.name === wanted || device.udid === wanted);
  } catch {
    simOk = false;
  }
  report(simOk, `simulator ${wanted}`, `xcrun simctl create ${wanted} "iPhone 17 Pro"`);
  const builds = appCandidates();
  report(builds.length > 0, `reusable build ${builds[0] ? rel(builds[0]) : ''}`, 'cd app-next && CI=1 npx expo run:ios --device generic --configuration Debug --no-bundler --output ./build');
  out.info(`metro ${(await metroRunning()) ? `running on :${metroPort}` : 'stopped (excer sim start launches it)'}`);
  for (const cli of ['gh', 'eas', 'asc', 'supabase', 'sentry', 'posthog-cli', 'adapty', 'gcloud']) out.info(`${cli.padEnd(12)}${has(cli) ? 'installed' : 'missing'}`);
  return failures === 0 ? 0 : 1;
}

export const newHelp = `excer new package <name>

Creates app-next/src/packages/<name>/ with index.ts and lib/, the package shape in
ARCHITECTURE.md. Then add the package to its layer in ARCHITECTURE.md and
app-next/.dependency-cruiser.cjs.`;

export function newCommand(args: string[]): number {
  const [kind, name] = args;
  if (kind !== 'package' || !name) throw new UsageError(newHelp);
  if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new UsageError('package names are lowercase words joined by hyphens');
  const dir = join(appRoot, 'src', 'packages', name);
  if (existsSync(dir)) throw new UsageError(`${rel(dir)} already exists`);
  mkdirSync(join(dir, 'lib'), { recursive: true });
  writeFileSync(join(dir, 'index.ts'), 'export {};\n');
  writeFileSync(join(dir, 'lib', '.gitkeep'), '');
  out.ok(`created ${rel(dir)}/index.ts and lib/`);
  out.info('next: add it to a layer in ARCHITECTURE.md and app-next/.dependency-cruiser.cjs');
  return 0;
}
