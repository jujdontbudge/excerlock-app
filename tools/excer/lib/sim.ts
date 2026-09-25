import { closeSync, existsSync, openSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { appRoot, stateDir, timestamp } from './paths.ts';
import { must, run, sleep } from './shell.ts';

export const bundleId = 'com.johansardar.excerlock';
export const metroPort = 8091;
const defaultSimName = 'ExcerLock-Next';

type Device = { udid: string; name: string; state: string };

export function devices(): Device[] {
  const parsed = JSON.parse(must('xcrun', ['simctl', 'list', 'devices', 'available', '-j'])) as { devices: Record<string, Device[]> };
  return Object.values(parsed.devices).flat();
}

export function ownedDevice(): Device {
  const wanted = process.env.EXCER_SIM ?? defaultSimName;
  const device = devices().find((candidate) => candidate.udid === wanted || candidate.name === wanted);
  if (!device) throw new Error(`No simulator named or with UDID "${wanted}". Set EXCER_SIM, or create one: xcrun simctl create ${defaultSimName} "iPhone 17 Pro"`);
  return device;
}

export async function boot(): Promise<Device> {
  const device = ownedDevice();
  if (device.state !== 'Booted') {
    must('xcrun', ['simctl', 'boot', device.udid]);
    must('xcrun', ['simctl', 'bootstatus', device.udid, '-b']);
    writeFileSync(join(stateDir(), 'booted-by-excer'), device.udid);
  }
  return { ...device, state: 'Booted' };
}

export function shutdown(): string {
  const device = ownedDevice();
  if (device.state !== 'Booted') return `${device.name} is already shut down`;
  must('xcrun', ['simctl', 'shutdown', device.udid]);
  return `${device.name} shut down`;
}

export function installed(udid: string): boolean {
  return run('xcrun', ['simctl', 'get_app_container', udid, bundleId]).code === 0;
}

export function appCandidates(): string[] {
  const derived = join(process.env.HOME ?? '', 'Library', 'Developer', 'Xcode', 'DerivedData');
  const fromDerived = run('/bin/sh', ['-c', `ls -d "${derived}"/ExcerLock-*/Build/Products/Debug-iphonesimulator/ExcerLock.app 2>/dev/null`]).stdout.split('\n');
  const checkouts = run('git', ['worktree', 'list', '--porcelain']).stdout.split('\n').filter((line) => line.startsWith('worktree ')).map((line) => join(line.slice(9), 'app-next', 'build', 'ExcerLock.app'));
  return [join(appRoot, 'build', 'ExcerLock.app'), ...checkouts, ...fromDerived]
    .filter((path) => path && existsSync(path))
    .filter((path, index, all) => all.indexOf(path) === index)
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
}

export function install(udid: string, path?: string): string {
  const app = path ?? appCandidates()[0];
  if (!app) throw new Error('No simulator build found. Build once with: cd app-next && CI=1 npx expo run:ios --device generic --configuration Debug --no-bundler --output ./build');
  must('xcrun', ['simctl', 'install', udid, app]);
  grantPermissions(udid);
  return app;
}

export function grantPermissions(udid: string): void {
  for (const service of ['location-always', 'motion', 'camera', 'photos'])
    run('xcrun', ['simctl', 'privacy', udid, 'grant', service, bundleId]);
}

export async function metroRunning(): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${metroPort}/status`, { signal: AbortSignal.timeout(1500) });
    return (await response.text()).includes('packager-status:running');
  } catch {
    return false;
  }
}

export const metroLog = () => join(stateDir(), 'metro.log');

export async function startMetro(): Promise<string> {
  if (await metroRunning()) return `Metro already running on :${metroPort}`;
  const log = openSync(metroLog(), 'w');
  const child = spawn('npx', ['expo', 'start', '--localhost', '--port', String(metroPort), '--dev-client'], {
    cwd: appRoot,
    detached: true,
    stdio: ['ignore', log, log],
    env: { ...process.env, CI: '1', NODE_OPTIONS: '--dns-result-order=ipv4first', EXCERLOCK_ENV: 'dev' },
  });
  child.unref();
  closeSync(log);
  writeFileSync(join(stateDir(), 'metro.pid'), String(child.pid));
  for (let attempt = 0; attempt < 90; attempt += 1) {
    if (await metroRunning()) return `Metro started on :${metroPort} (log ${metroLog()})`;
    await sleep(1000);
  }
  throw new Error(`Metro did not start within 90 s; see ${metroLog()}`);
}

export function stopMetro(): string {
  const pidFile = join(stateDir(), 'metro.pid');
  if (!existsSync(pidFile)) return 'No Metro started by excer';
  const pid = Number(readFileSync(pidFile, 'utf8'));
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    return 'Metro was not running';
  }
  return `Stopped Metro (pid ${pid})`;
}

export function openUrl(udid: string, target: string): string {
  const url = /^[a-z][\w+.-]*:/.test(target) ? target : `excerlock://${target.replace(/^\/+/, '')}`;
  must('xcrun', ['simctl', 'openurl', udid, url]);
  return url;
}

export function launchDevClient(udid: string): void {
  openUrl(udid, `excerlock://expo-development-client/?url=${encodeURIComponent(`http://127.0.0.1:${metroPort}`)}`);
}

export function screenshot(udid: string, path = join(stateDir('shots'), `${timestamp()}.png`)): string {
  must('xcrun', ['simctl', 'io', udid, 'screenshot', path]);
  return path;
}

export type AxNode = { AXLabel?: string | null; AXValue?: string | null; type?: string; frame: { x: number; y: number; width: number; height: number } };

export function tree(udid: string): AxNode[] {
  return JSON.parse(must('idb', ['ui', 'describe-all', '--udid', udid])) as AxNode[];
}

const normalise = (text: string) => text.replace(/ /g, ' ').trim();

export const labels = (nodes: AxNode[]) =>
  nodes.map((node) => normalise([node.AXLabel, node.AXValue].filter(Boolean).join(' '))).filter(Boolean);

export async function waitForLabels(udid: string, expected: string[], seconds: number): Promise<{ found: string[]; missing: string[]; nodes: AxNode[] }> {
  const deadline = Date.now() + seconds * 1000;
  let nodes: AxNode[] = [];
  let missing = expected;
  while (Date.now() < deadline) {
    nodes = tree(udid);
    const text = labels(nodes);
    missing = expected.filter((want) => !text.some((label) => label.includes(normalise(want))));
    if (missing.length === 0) break;
    await sleep(700);
  }
  return { found: expected.filter((want) => !missing.includes(want)), missing, nodes };
}

export async function tap(udid: string, label: string): Promise<string> {
  const { missing, nodes } = await waitForLabels(udid, [label], 8);
  if (missing.length > 0) throw new Error(`No accessible element labelled "${label}"`);
  const matches = nodes.filter((node) => labels([node])[0]?.includes(normalise(label)));
  matches.sort((a, b) => Number(a.type !== 'Button') - Number(b.type !== 'Button'));
  const frame = matches[0]?.frame;
  if (!frame) throw new Error(`"${label}" has no frame`);
  const x = Math.round(frame.x + frame.width / 2);
  const y = Math.round(frame.y + frame.height / 2);
  must('idb', ['ui', 'tap', '--udid', udid, String(x), String(y)]);
  return `tapped "${label}" at ${x},${y}`;
}

export async function metroClients(): Promise<number> {
  try {
    const response = await fetch(`http://127.0.0.1:${metroPort}/json/list`, { signal: AbortSignal.timeout(1500) });
    return ((await response.json()) as unknown[]).length;
  } catch {
    return 0;
  }
}

async function connect(udid: string): Promise<boolean> {
  run('xcrun', ['simctl', 'terminate', udid, bundleId]);
  launchDevClient(udid);
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if ((await metroClients()) > 0) return true;
    await sleep(2000);
  }
  return false;
}

export async function ensureApp(options: { reinstall?: boolean } = {}): Promise<Device> {
  const device = await boot();
  if (options.reinstall || !installed(device.udid)) install(device.udid);
  else grantPermissions(device.udid);
  await startMetro();
  if ((await metroClients()) === 0 && !(await connect(device.udid))) {
    run('xcrun', ['simctl', 'uninstall', device.udid, bundleId]);
    install(device.udid);
    if (!(await connect(device.udid))) throw new Error(`The app did not attach to Metro; see ${metroLog()}`);
  }
  for (let attempt = 0; attempt < 90 && !appReady(device.udid); attempt += 1) await sleep(2000);
  await dismissDevMenu(device.udid);
  return device;
}

export async function relaunch(udid: string): Promise<void> {
  if (!(await connect(udid))) throw new Error(`The app did not reattach to Metro; see ${metroLog()}`);
  for (let attempt = 0; attempt < 60 && !appReady(udid); attempt += 1) await sleep(1500);
  await dismissDevMenu(udid);
}

async function dismissDevMenu(udid: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const text = labels(tree(udid));
    if (text.some((label) => label.startsWith('This is the developer menu'))) await tap(udid, 'Continue');
    else if (text.some((label) => label.startsWith('Connected to:')) && text.includes('Close')) await tap(udid, 'Close');
    else return;
    await sleep(900);
  }
}

function appReady(udid: string): boolean {
  const text = labels(tree(udid)).join(' ');
  return text.length > 'ExcerLock'.length && !/Starting ExcerLock|Bundling|Development servers|Fetch development servers|Loading from/i.test(text);
}
