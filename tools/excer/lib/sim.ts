import { closeSync, existsSync, openSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { appRoot, stateDir, timestamp } from './paths.ts';
import { walk } from './files.ts';
import { must, run, sleep } from './shell.ts';

export const bundleId = 'com.johansardar.excerlock';
function configuredMetroPort(): number {
  const raw = process.env.EXCER_METRO_PORT;
  if (raw === undefined || raw === '') return 8091;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error(`EXCER_METRO_PORT must be a port number from 1024 to 65535, got "${raw}"`);
  return port;
}
export const metroPort = configuredMetroPort();
const defaultSimName = 'ExcerLock-Next';

export const workerSimSet = join(homedir(), '.local', 'share', 'excer', 'worker-simulators');

type Device = { udid: string; name: string; state: string; set?: string };

const knownSets = new Map<string, string | undefined>();

function listSet(set?: string): Device[] {
  const args = set ? ['simctl', '--set', set, 'list', 'devices', 'available', '-j'] : ['simctl', 'list', 'devices', 'available', '-j'];
  const parsed = JSON.parse(must('xcrun', args)) as { devices: Record<string, Device[]> };
  return Object.values(parsed.devices).flat().map((device) => ({ ...device, set }));
}

export function devices(): Device[] {
  const all = [...(existsSync(workerSimSet) ? listSet(workerSimSet) : []), ...listSet()];
  for (const device of all) if (!knownSets.has(device.udid)) knownSets.set(device.udid, device.set);
  return all;
}

export function deviceSet(udid: string): string | undefined {
  if (!knownSets.has(udid)) devices();
  return knownSets.get(udid);
}

export function simctlArgs(udid: string, args: string[]): string[] {
  const set = deviceSet(udid);
  return set ? ['simctl', '--set', set, ...args] : ['simctl', ...args];
}

function isMainCheckout(): boolean {
  const [gitDir, commonDir] = run('git', ['rev-parse', '--path-format=absolute', '--git-dir', '--git-common-dir']).stdout.trim().split('\n');
  return Boolean(gitDir) && gitDir === commonDir;
}

export function ownedDevice(): Device {
  const wanted = process.env.EXCER_SIM ?? defaultSimName;
  const device = devices().find((candidate) => candidate.udid === wanted || candidate.name === wanted);
  if (!device) throw new Error(`No simulator named or with UDID "${wanted}". Set EXCER_SIM, or create one: xcrun simctl create ${defaultSimName} "iPhone 17 Pro"`);
  if (!isMainCheckout() && device.set !== workerSimSet)
    throw new Error(`${device.name} is not a worker simulator. A worktree must set EXCER_SIM to its own simulator in ${workerSimSet} (see AGENTS.md "Spawning workers"); ${defaultSimName} belongs to the lead session.`);
  return device;
}

export async function boot(): Promise<Device> {
  const device = ownedDevice();
  if (device.state !== 'Booted') {
    must('xcrun', simctlArgs(device.udid, ['boot', device.udid]));
    must('xcrun', simctlArgs(device.udid, ['bootstatus', device.udid, '-b']));
    writeFileSync(join(stateDir(), 'booted-by-excer'), device.udid);
  }
  return { ...device, state: 'Booted' };
}

export function shutdown(): string {
  const device = ownedDevice();
  if (device.state !== 'Booted') return `${device.name} is already shut down`;
  must('xcrun', simctlArgs(device.udid, ['shutdown', device.udid]));
  return `${device.name} shut down`;
}

export function installed(udid: string): boolean {
  return run('xcrun', simctlArgs(udid, ['get_app_container', udid, bundleId])).code === 0;
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
  must('xcrun', simctlArgs(udid, ['install', udid, app]));
  grantPermissions(udid);
  return app;
}

export function grantPermissions(udid: string): void {
  for (const service of ['location-always', 'motion', 'camera', 'photos'])
    run('xcrun', simctlArgs(udid, ['privacy', udid, 'grant', service, bundleId]));
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

function newestSourceChange(): number {
  let newest = 0;
  for (const entry of ['src', 'app', 'modules']) for (const file of walk(join(appRoot, entry))) newest = Math.max(newest, statSync(file).mtimeMs);
  return newest;
}

async function bundleError(): Promise<string | null> {
  try {
    const response = await fetch(`http://127.0.0.1:${metroPort}/app-next/index.bundle?platform=ios&dev=true&minify=false`, { signal: AbortSignal.timeout(300_000) });
    const body = await response.text();
    if (response.ok && !body.startsWith('{"type"')) return null;
    return (JSON.parse(body) as { message?: string }).message?.split('\n')[0] ?? `HTTP ${response.status}`;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export async function ensureFreshMetro(): Promise<void> {
  const started = join(stateDir(), 'metro.started');
  const stale = !existsSync(started) || Number(readFileSync(started, 'utf8')) < newestSourceChange();
  if (stale && (await metroRunning())) {
    stopMetro();
    for (let attempt = 0; attempt < 30 && (await metroRunning()); attempt += 1) await sleep(500);
  }
  if (!(await metroRunning())) writeFileSync(started, String(Date.now()));
  await startMetro();
  const error = await bundleError();
  if (error) throw new Error(`The app bundle does not build, so a proof would run stale code: ${error}`);
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
  must('xcrun', simctlArgs(udid, ['openurl', udid, url]));
  return url;
}

export function launchDevClient(udid: string): void {
  openUrl(udid, `excerlock://expo-development-client/?url=${encodeURIComponent(`http://127.0.0.1:${metroPort}`)}`);
}

export function screenshot(udid: string, path = join(stateDir('shots'), `${timestamp()}.png`)): string {
  must('xcrun', simctlArgs(udid, ['io', udid, 'screenshot', path]));
  return path;
}

export type AxNode = { AXLabel?: string | null; AXValue?: string | null; type?: string; frame: { x: number; y: number; width: number; height: number } };

const companionSocket = (udid: string) => `/tmp/idb/${udid}_companion.sock`;

export function ensureCompanion(udid: string): void {
  if (run('idb', ['ui', 'describe-all', '--udid', udid]).code === 0) return;
  const socket = companionSocket(udid);
  run('/bin/mkdir', ['-p', '/tmp/idb']);
  run('/bin/rm', ['-f', socket]);
  const log = openSync(join(stateDir(), `idb-companion-${udid}.log`), 'w');
  const set = deviceSet(udid);
  const child = spawn('idb_companion', ['--udid', udid, '--grpc-domain-sock', socket, ...(set ? ['--device-set-path', set] : [])], { detached: true, stdio: ['ignore', log, log] });
  child.unref();
  closeSync(log);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (existsSync(socket) && run('idb', ['ui', 'describe-all', '--udid', udid]).code === 0) return;
    run('/bin/sleep', ['0.5']);
  }
  throw new Error(`idb_companion did not start for ${udid}; see ${join(stateDir(), `idb-companion-${udid}.log`)}`);
}

export function tree(udid: string): AxNode[] {
  ensureCompanion(udid);
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
  const exact = (node: AxNode) => Number(labels([node])[0] !== normalise(label));
  matches.sort((a, b) => exact(a) - exact(b) || Number(a.type !== 'Button') - Number(b.type !== 'Button'));
  const frame = matches[0]?.frame;
  if (!frame) throw new Error(`"${label}" has no frame`);
  const x = Math.round(frame.x + frame.width / 2);
  const y = Math.round(frame.y + frame.height / 2);
  must('idb', ['ui', 'tap', '--udid', udid, String(x), String(y)]);
  return `tapped "${label}" at ${x},${y}`;
}

export function swipeBack(udid: string): string {
  const nodes = tree(udid);
  const screen = nodes
    .map((node) => node.frame)
    .filter((frame) => frame.x === 0 && frame.y === 0 && frame.width > 0 && frame.height > 0)
    .sort((a, b) => b.width * b.height - a.width * a.height)[0];
  if (!screen) throw new Error('Accessibility tree has no screen frame');
  const xStart = Math.max(1, Math.round(screen.width * 0.01));
  const xEnd = Math.round(screen.width * 0.85);
  const y = Math.round(screen.height * 0.5);
  must('idb', ['ui', 'swipe', '--udid', udid, String(xStart), String(y), String(xEnd), String(y), '--duration', '0.5']);
  return `swiped back from ${xStart},${y} to ${xEnd},${y}`;
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
  run('xcrun', simctlArgs(udid, ['terminate', udid, bundleId]));
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
  await ensureFreshMetro();
  if ((await metroClients()) === 0 && !(await connect(device.udid))) {
    run('xcrun', simctlArgs(device.udid, ['uninstall', device.udid, bundleId]));
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
