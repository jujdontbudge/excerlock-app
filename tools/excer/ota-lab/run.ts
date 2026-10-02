import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { stateDir, timestamp } from '../lib/paths.ts';
import { must, run, sleep } from '../lib/shell.ts';
import { bundleId, ensureCompanion, ownedDevice, screenshot, simctlArgs } from '../lib/sim.ts';
import { cases, type LabCase } from './cases.ts';
import { labRoot } from './prepare.ts';
import type { LabEvent } from './server.ts';
import { reviewVideo } from './review.ts';

const origin = 'http://127.0.0.1:8098';
const localApp = () => join(labRoot(), 'derived/Build/Products/Release-iphonesimulator/ExcerLock.app');
const buttons: Record<string, string[]> = {
  O07: ['Male'], O04: ['First name'], O05: ['Friends'], O06: ['25–34'], O08: ['Less screen time'], O22: ['Gain muscle', 'Lose fat'],
  W0: ['5,000–10,000 steps'], W1: ['Outside'], W2: ['Reach a step goal'], G0F: ['3 times'], G0H: ['1 hour'], G1: ['While you are at the gym'],
};

export async function runLabCase(name: string): Promise<number> {
  const spec = cases.find((entry) => entry.name === name);
  if (!spec) throw new Error(`Unknown case ${name}. Use ./excer ota-lab list`);
  const device = ownedDevice();
  if (device.set === undefined) throw new Error('OTA lab requires a worker simulator');
  if (!existsSync(join(localApp(), 'ExcerLock'))) throw new Error(`Local Release executable is missing: ${localApp()}`);
  const dir = stateDir('ota-lab', 'evidence', `${timestamp()}-${name}`);
  const deadline = Date.now() + 300000;
  ensureCompanion(device.udid);
  const idb = (args: string[]) => must('idb', ['--companion', `/tmp/idb/${device.udid}_companion.sock`, ...args, '--udid', device.udid], { timeout: 5000 });
  type UiNode = { AXLabel?: string; AXValue?: string; type?: string; frame: { x: number; y: number; width: number; height: number } };
  let treeCache: UiNode[] | null = null;
  const tree = () => treeCache ??= JSON.parse(idb(['ui', 'describe-all'])) as UiNode[];
  const labels = () => tree().map((entry) => [entry.AXLabel, entry.AXValue].join(' ')).join(' ');
  const tap = async (label: string, repeat = 1) => {
    const nodes = tree().filter((entry) => [entry.AXLabel, entry.AXValue].join(' ').includes(label));
    nodes.sort((a, b) => Number(a.type !== 'Button') - Number(b.type !== 'Button'));
    const node = nodes[0];
    if (!node) throw new Error(`Missing tappable label ${label}`);
    for (let count = 0; count < repeat; count++) idb(['ui', 'tap', String(Math.round(node.frame.x + node.frame.width / 2)), String(Math.round(node.frame.y + node.frame.height / 2))]);
    await sleep(100);
  };
  const control = async (body: Record<string, unknown>) => fetch(`${origin}/control`, { method: 'POST', body: JSON.stringify(body), signal: AbortSignal.timeout(3000) });
  const readEvents = async () => (await (await fetch(`${origin}/events`, { signal: AbortSignal.timeout(3000) })).json()) as LabEvent[];
  const launch = () => must('xcrun', simctlArgs(device.udid, ['launch', device.udid, bundleId]));
  const terminate = () => run('xcrun', simctlArgs(device.udid, ['terminate', device.udid, bundleId]));
  terminate();
  must('xcrun', simctlArgs(device.udid, ['uninstall', device.udid, bundleId]));
  must('xcrun', simctlArgs(device.udid, ['install', device.udid, localApp()]));
  const videoStartedAtMs = Date.now();
  const video = spawn('xcrun', simctlArgs(device.udid, ['io', device.udid, 'recordVideo', '--codec=h264', join(dir, 'video.mp4')]), { stdio: 'ignore' });
  const result: { status: string; title: string; launchToInteractiveMs: number | null; reloadCoverMs: number[]; error?: string; evidence: string; assertions?: string[] } = {
    status: 'blocked', title: spec.title, launchToInteractiveMs: null, reloadCoverMs: [], evidence: dir,
  };
  let launched = Date.now();
  let handled = '';
  let interrupted = false;
  let didBack = false;
  let expectedBack: string | null = null;
  let acted = false;
  let terminalSeenAt: number | null = null;
  let frameKey = '';
  let captured = 0;
  let crashReopens = 0;
  let events: LabEvent[] = [];
  let minimumFrameAt = 0;
  let terminalForegrounded = false;
  try {
    if (spec.returning || spec.mode === 'rollback') {
      await control({ variant: 'copy', mode: spec.returning ? 'offline' : 'normal', delayMs: 0, legacy: spec.legacy });
      launch();
      const seedDeadline = Date.now() + 25000;
      while (Date.now() < seedDeadline) {
        const seed = await readEvents();
        if (seed.some((event) => event.event === 'frame' && !event.cover && event.page !== '/') && (!spec.legacy || seed.some((event) => event.event === 'legacy-ready'))) {
          writeFileSync(join(dir, 'seed-events.json'), JSON.stringify(seed, null, 2)); break;
        }
        await sleep(200);
      }
      terminate();
    }
    const releaseAtPage = spec.action && spec.action !== 'setup' ? `/lab/${spec.action}` : spec.landAt === 'home' ? '/home' : spec.landAt === 'X1' ? '/setup/screenTime' : spec.landAt === 'P' ? '/paywall'
      : spec.landAt === 'sign-in' ? '/sign-in' : spec.landAt ? `/onboarding/${spec.landAt}` : undefined;
    await control({ variant: spec.variant, mode: spec.mode ?? 'normal', delayMs: spec.delayMs ?? 0, releaseAtPage, second: spec.second,
      releaseDelayMs: spec.interruption === 'network' ? 1500 : 0, transition: spec.transition });
    launched = Date.now(); launch();
    console.log(`Driving: ${spec.title}`);
    while (Date.now() < deadline) {
      treeCache = null;
      events = await readEvents();
      const frame = events.filter((entry) => entry.event === 'frame' && entry.at > minimumFrameAt).at(-1);
      if (!frame || frame.cover || frame.page === '/') {
        const crashStart = events.filter((entry) => entry.event === 'reload-start').at(-1)?.at ?? launched;
        if (spec.variant === 'crash' && Date.now() - crashStart > (crashReopens + 1) * 20000 && crashReopens < 2) {
          crashReopens++; terminate(); launch();
        }
        await sleep(200); continue;
      }
      if (result.launchToInteractiveMs === null) {
        const exposed = events.find((entry) => entry.event === 'cover-hidden' && entry.at >= launched && entry.updateId === frame.updateId);
        const prepared = exposed && events.some((entry) => entry.event === 'frame' && entry.at <= exposed.at && entry.page === frame.page && entry.updateId === frame.updateId);
        result.launchToInteractiveMs = (prepared ? exposed.at : frame.at) - launched;
        screenshot(device.udid, join(dir, 'first-interactive.png'));
      }
      const signInSheet = spec.landAt === 'sign-in' && labels().includes('Continue with Apple');
      const page = signInSheet ? 'sign-in' : frame.page === '/paywall' ? 'P' : frame.page?.split('/').at(-1) ?? '';
      if (signInSheet && !acted) {
        acted = true;
        await fetch(`${origin}/events`, { method: 'POST', body: JSON.stringify({ event: 'sign-in-open', page: '/sign-in' }) });
      }
      if (expectedBack && page === expectedBack) {
        await fetch(`${origin}/events`, { method: 'POST', body: JSON.stringify({ event: 'back-returned', page: frame.page }) });
        expectedBack = null;
      }
      const key = `${frame.updateId}:${page}`;
      if (frameKey !== key) {
        frameKey = key;
        screenshot(device.udid, join(dir, `${String(++captured).padStart(2, '0')}-${page}.png`));
        console.log(`  ${page}${frame.embedded ? ' (embedded)' : ` (${frame.variant ?? 'update'})`}`);
      }
      if (frame.prompt && spec.action !== 'permission') {
        if (labels().includes('Allow')) await tap('Allow');
        await sleep(200); continue;
      }
      if (spec.action && !acted && ((['purchase', 'restore', 'setup'].includes(spec.action) && page === 'P') || (spec.action === 'permission' && page === 'S3d'))) {
        const actionLabel = spec.action === 'restore' ? 'Restore purchases' : spec.action === 'permission' ? 'Continue' : 'Start for $0.00';
        if (!labels().includes(actionLabel)) { await sleep(200); continue; }
        acted = true;
        await tap(actionLabel);
        await sleep(200); continue;
      }
      if (spec.action === 'setup' && page === 'sign-in') {
        await tap('Continue with Apple'); await sleep(1000); continue;
      }
      if ((spec.verifySetup && ['screenTime', 'apps'].includes(page)) || (spec.landAt === 'home' && frame.page?.startsWith('/setup/'))) {
        await tap('Not now'); await sleep(500); continue;
      }
      if (spec.action === 'permission' && page === 'S3d' && acted) {
        if (frame.pending && frame.prompt) { await sleep(2000); result.status = 'pass'; break; }
        await sleep(200); continue;
      }
      if (page === spec.until && (!spec.action || acted || spec.action === 'setup')) {
        terminalSeenAt ??= Date.now();
        if (spec.holdPage && !frame.pending && Date.now() - terminalSeenAt < 15000) { await sleep(200); continue; }
        if (spec.foregroundAtTerminal && frame.pending && !terminalForegrounded) {
          terminalForegrounded = true;
          idb(['ui', 'button', 'HOME']); await sleep(1000); launch();
          await fetch(`${origin}/events`, { method: 'POST', body: JSON.stringify({ event: 'terminal-foreground', page: frame.page }) });
        }
        await sleep(spec.holdPage ? 2000 : 1000);
        events = await readEvents();
        break;
      }
      if (spec.interruption && page === spec.landAt && !interrupted) {
        interrupted = true;
        await fetch(`${origin}/events`, { method: 'POST', body: JSON.stringify({ event: `interrupt-${spec.interruption}`, page: frame.page }) });
        screenshot(device.udid, join(dir, 'before-interruption.png'));
        if (spec.interruption === 'kill') { minimumFrameAt = Date.now(); terminate(); await sleep(1000); launch(); }
        else if (spec.interruption === 'background') { idb(['ui', 'button', 'HOME']); await sleep(1000); launch(); }
        else {
          await fetch(`${origin}/network`, { method: 'POST', body: JSON.stringify({ offline: true }) });
          await sleep(1000);
          await fetch(`${origin}/network`, { method: 'POST', body: JSON.stringify({ offline: false }) });
        }
        handled = ''; await sleep(1000);
        if (spec.interruption !== 'kill') {
          screenshot(device.udid, join(dir, 'after-interruption.png'));
          const visible = labels();
          await fetch(`${origin}/events`, { method: 'POST', body: JSON.stringify({ event: 'resume-check', ok: spec.landAt === 'O23'
            ? visible.includes('How many pounds of muscle') && visible.includes('Continue') : visible.includes('Male') && visible.includes('Female') }) });
        }
        continue;
      }
      if (page === spec.landAt && !frame.pending && frame.embedded && spec.interruption !== 'network') { await sleep(200); continue; }
      if (spec.second && page === spec.landAt && frame.embedded && !events.some((entry) => entry.event === 'second-ready' && entry.pending === frame.pending)) { await sleep(200); continue; }
      if (!frame.embedded && !didBack && spec.landAt && spec.until === 'P' && page !== 'P') {
        didBack = true;
        await sleep(700);
        if (labels().includes('Back')) {
          const path = frame.path as string[];
          expectedBack = path[Math.max(0, path.indexOf(page) - 1)] ?? null;
          await fetch(`${origin}/events`, { method: 'POST', body: JSON.stringify({ event: 'back-exercise', page: frame.page, expected: expectedBack }) });
          await tap('Back'); handled = ''; await sleep(700); continue;
        }
      }
      if (handled === key && !(spec.transition && page === spec.landAt && events.some((entry) => entry.event === 'page-entry-end' && entry.page === frame.page))) { await sleep(200); continue; }
      await sleep(spec.rapid && page === spec.landAt ? 0 : page === 'S3b' ? 3200 : page === 'S5' ? 1500 : 450);
      if (page === 'O01' && spec.landAt === 'sign-in') { await tap('Sign in'); handled = key; continue; }
      for (const label of buttons[page] ?? []) {
        if (page === 'O04') { if (!tree().some((entry) => entry.AXValue === 'Alex')) { await tap(label); idb(['ui', 'text', 'Alex']); treeCache = null; } }
        else if (labels().includes(label)) await tap(label);
      }
      if (page === 'O20') await tap(spec.activity === 'gym' ? 'Gym' : 'Walking');
      if (page === 'S2') { await sleep(1000); continue; }
      const label = ['O01', 'O02', 'O03'].includes(page) ? 'Get started' : page === 'S3' ? 'Import' : page === 'S3c' ? 'Try for $0.00' : 'Continue';
      if (!labels().includes(label)) { await sleep(200); continue; }
      await tap(label, spec.rapid && page === spec.landAt ? 4 : 1);
      handled = key;
    }
    if (Date.now() >= deadline) result.error = 'Five-minute proof deadline reached';
    else {
      const assessed = assess(spec, events, result.launchToInteractiveMs);
      result.status = assessed.status; result.assertions = assessed.assertions;
    }
  } catch (error) { result.error = error instanceof Error ? error.message : String(error); }
  finally {
    treeCache = null;
    screenshot(device.udid, join(dir, 'final.png'));
    writeFileSync(join(dir, 'labels.json'), JSON.stringify(tree(), null, 2));
    video.kill('SIGINT');
    await Promise.race([new Promise<void>((done) => video.once('exit', () => done())), sleep(3000)]);
    events = await readEvents();
    for (const start of events.filter((entry) => entry.event === 'reload-start')) {
      const end = events.find((entry) => entry.event === 'native-cover-hidden' && entry.at > start.at);
      if (end) result.reloadCoverMs.push(end.at - start.at);
    }
    if (result.status === 'pass' && result.reloadCoverMs.some((duration) => duration > 2000)) {
      result.status = 'fail'; result.assertions = [...(result.assertions ?? []), 'reload cover exceeded two seconds'];
    }
    if (existsSync(join(labRoot(), 'events.jsonl'))) copyFileSync(join(labRoot(), 'events.jsonl'), join(dir, 'events.jsonl'));
    const container = run('xcrun', simctlArgs(device.udid, ['get_app_container', device.udid, bundleId, 'data'])).stdout.trim();
    const db = join(container, 'Library/Application Support/.expo-internal/expo-v11.db');
    if (existsSync(db)) {
      const query = run('sqlite3', ['-json', db, 'SELECT hex(id) AS id,status,successful_launch_count,failed_launch_count FROM updates']);
      writeFileSync(join(dir, 'updates-db.json'), query.stdout || query.stderr);
      if (spec.variant === 'crash' && result.status !== 'blocked') {
        const rows = JSON.parse(query.stdout) as { failed_launch_count: number }[];
        const failed = rows.reduce((count, row) => count + row.failed_launch_count, 0);
        if (failed < 1 || failed > 2) {
          result.status = 'fail';
          result.assertions = [...(result.assertions ?? []), `native crash attempts were ${failed}, expected one or two`];
        }
      }
    } else if (spec.variant === 'crash' && result.status !== 'blocked') {
      result.status = 'blocked'; result.error = 'Native update database was unavailable for crash recovery assertion';
    }
    try {
      const review = reviewVideo(dir, videoStartedAtMs, launched, result.launchToInteractiveMs, events);
      if (review.status === 'fail' && result.status === 'pass') {
        result.status = 'fail'; result.assertions = [...(result.assertions ?? []), 'video contains a blank pale frame after visible content'];
      }
    } catch (error) {
      if (result.status === 'pass') { result.status = 'blocked'; result.error = error instanceof Error ? error.message : String(error); }
    }
    writeFileSync(join(dir, 'result.json'), JSON.stringify({ ...result, events, crashReopens, launchedAtMs: launched, videoStartedAtMs }, null, 2));
    console.log(`${result.status}: ${spec.title}\nFirst interactive: ${result.launchToInteractiveMs ?? 'unmeasured'} ms; reload cover: ${result.reloadCoverMs.join(', ') || 'none measured'} ms\nEvidence: ${dir}${result.error ? `\n${result.error}` : ''}`);
  }
  return result.status === 'pass' ? 0 : 1;
}

function assess(spec: LabCase, events: LabEvent[], launchMs: number | null): { status: string; assertions: string[] } {
  const failures: string[] = [];
  if (launchMs === null || launchMs > 8500) failures.push('first interactive exceeded 8.5 seconds');
  const frames = events.filter((entry) => entry.event === 'frame' && !entry.cover && entry.page !== '/');
  const starts = events.filter((entry) => entry.event === 'reload-start');
  if (starts.length > 1) failures.push('more than one JavaScript reload');
  if (frames.some((entry) => entry.prerequisiteAnswersPresent === false)) failures.push('a page appeared without its prerequisite answers');
  if (events.some((entry) => entry.event === 'back-exercise') && !events.some((entry) => entry.event === 'back-returned')) failures.push('Back did not return to its expected page');
  if (spec.interruption && spec.interruption !== 'kill' && !events.some((entry) => entry.event === 'resume-check' && entry.ok)) failures.push('interruption did not preserve the question');
  if (spec.interruption === 'kill') {
    const interrupt = events.find((entry) => entry.event === 'interrupt-kill');
    if (!interrupt || frames.find((entry) => (entry.jsModuleEpochMs ?? 0) > interrupt.at)?.page !== `/onboarding/${spec.landAt}`) failures.push('cold reopen resumed the wrong question');
  }
  if (spec.transition) {
    if (!events.some((entry) => entry.event === 'advance-request' && entry.entering)) failures.push('Continue was not pressed during page entry');
    const start = starts[0];
    const entry = start && events.filter((event) => event.event === 'page-entry-start' && event.at < start.at).at(-1);
    if (entry && !events.some((event) => event.event === 'page-entry-end' && event.page === entry.page && event.at > entry.at && event.at < start!.at)) failures.push('reload began before page entry settled');
  }
  if (spec.mode === 'never' || spec.mode === 'offline' || spec.mode === 'unavailable' || spec.mode === 'cutoff' || spec.mode === 'corrupt' || spec.name === 'first-slow') {
    if (frames.at(-1)?.embedded !== true) failures.push('expected embedded fallback');
  } else if (spec.holdPage) {
    if (starts.length > 0 || frames.some((entry) => entry.embedded !== true)) failures.push('reloaded at a forbidden moment');
    if (!frames.some((entry) => entry.pending)) failures.push('update did not finish downloading at the forbidden moment');
    if (['purchase', 'restore'].includes(spec.action ?? '') && !frames.some((entry) => entry.purchaseBusy && entry.pending)) failures.push('busy operation and pending update did not overlap');
    if (spec.foregroundAtTerminal && !events.some((entry) => entry.event === 'terminal-foreground')) failures.push('foreground reload opportunity was not exercised');
  } else if (spec.mode === 'rollback' || spec.variant === 'crash') {
    if (frames.at(-1)?.embedded !== true) failures.push('did not recover to embedded');
    if (spec.landAt) {
      const start = starts[0];
      const boundary = start && events.filter((entry) => entry.event === 'boundary' && entry.at <= start.at).at(-1);
      const destination = start && frames.find((entry) => (entry.jsModuleEpochMs ?? 0) > start.at);
      if (!boundary || destination?.page !== `/onboarding/${boundary.next}`) failures.push('crash fallback lost the onboarding destination');
    }
  } else if (spec.interruption === 'network' && !frames.some((entry) => entry.pending)) {
    if (starts.length || frames.at(-1)?.embedded !== true) failures.push('interrupted download did not preserve runnable embedded code');
    if (!events.some((entry) => entry.event === 'network-offline') || !events.some((entry) => entry.event === 'network-online')) failures.push('network interruption was not exercised');
  } else {
    const updated = frames.filter((entry) => entry.embedded === false);
    if (!updated.length) failures.push('new code never became interactive');
    if (updated.at(-1)?.variant !== (spec.second ?? spec.variant)) failures.push('destination ran the wrong update');
    if (spec.landAt) {
      if (starts.length !== 1 && spec.interruption !== 'kill') failures.push('expected one page-boundary reload');
      if (starts.length && !events.some((entry) => entry.event === 'answers-preserved' && entry.checked && entry.ok)) failures.push('saved answers were not verified after reload');
      const start = starts[0];
      const boundary = start && events.filter((entry) => entry.event === 'boundary' && entry.at <= start.at).at(-1);
      const destination = start && updated.find((entry) => entry.at > start.at);
      if (start && (!boundary || !destination || destination.page !== (boundary.next === 'P' ? '/paywall' : `/onboarding/${boundary.next}`))) failures.push('page after reload did not match the boundary destination');
      if (start && boundary?.next !== 'P' && destination?.progress !== boundary?.progress) failures.push('progress changed across the reload');
      const changed = ['added-page', 'removed-follow-up', 'changed-branch', 'renamed-page'].includes(spec.variant);
      if (changed && updated.some((entry) => entry.page?.startsWith('/onboarding/'))) failures.push('changed flow reloaded before the Paywall');
    }
    if (spec.verifySetup && !frames.some((entry) => entry.page === `/setup/${spec.until}` && entry.setupMatchesAnswers)) failures.push('Setup did not follow the preserved answers');
  }
  if (spec.until === 'P' || spec.verifySetup || spec.action === 'setup') {
    const views = events.filter((entry) => entry.event === 'paywall_viewed');
    const shown = frames.find((entry) => entry.page === '/paywall');
    if (views.length !== 1) failures.push('Paywall impression was missing or duplicated');
    if (!shown || views[0]?.properties?.first_paywall_view !== !spec.legacy || views[0]?.properties?.is_embedded !== shown.embedded || views[0]?.properties?.update_id !== shown.updateId) failures.push('first Paywall metadata did not identify running code');
  }
  return { status: failures.length ? 'fail' : 'pass', assertions: failures.length ? failures : ['launch budget', 'one reload at most', 'destination and progress', 'prerequisite answers', 'Paywall impression and running update identity'] };
}
