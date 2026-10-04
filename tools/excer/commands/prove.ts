import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { findFeature, protectedAppRoutes, type Proof, type ProofAction } from '../lib/features.ts';
import { rel, stateDir, timestamp } from '../lib/paths.ts';
import { option, out, run, UsageError } from '../lib/shell.ts';
import { ensureApp, labels, openUrl, relaunch, screenshot, setLocation, swipeBack, tap, typeText, waitForLabels, watchForLabels } from '../lib/sim.ts';
import { sleep } from '../lib/shell.ts';
import { loadScenario } from './sim.ts';

const absentWatchSeconds = 4;

export const help = `excer prove <feature> [--proof <name>]

Runs the feature's proof blocks on the simulator: loads each scenario, opens its
route, waits until the expected labels are on screen, and saves a screenshot, the
accessibility tree and result.json under .excer/proof/<feature>/<time>/.
Exit 0 only when every expectation was seen. Feature files:
.agents/skills/verify-excerlock/references/features/<feature>.md`;

type RouteAttempt = { route: string; href: string; ok: boolean; missing: string[] };
type NotificationAttempt = { destination: 'home' | 'unlock'; ok: boolean; missing: string[] };
type GestureAttempt = { gesture: 'back'; result: string };
type ActionAttempt = { action: ProofAction['kind']; value: string; result: string };
type RelaunchAttempt = { before: string[]; after: string[]; ok: boolean };
type Outcome = { proof: string; ok: boolean; missing: string[]; screenshot: string; tree: string; actionAttempts?: ActionAttempt[]; routeAttempts?: RouteAttempt[]; notificationAttempts?: NotificationAttempt[]; gestureAttempts?: GestureAttempt[]; relaunchAttempt?: RelaunchAttempt };

async function runProof(feature: string, proof: Proof, dir: string): Promise<Outcome> {
  let udid: string;
  if (proof.scenario) udid = await loadScenario(proof.scenario, proof.open, proof.prompt ?? 'grant', proof.relaunch ?? false, proof.openWait ?? 1.5);
  else {
    udid = (await ensureApp()).udid;
    if (proof.open) openUrl(udid, proof.open);
    await sleep((proof.openWait ?? 1.5) * 1000);
  }
  const failedTaps: string[] = [];
  const actionAttempts: ActionAttempt[] = [];
  for (const action of proof.actions ?? []) {
    try {
      const expected = action.kind === 'expect' ? await waitForLabels(udid, [action.value], proof.wait) : null;
      if (expected && expected.missing.length) throw new Error('Expected transition was not shown');
      if (expected) screenshot(udid, join(dir, `${proof.name}.action-${actionAttempts.length}.png`));
      const result = action.kind === 'expect' ? 'expected label shown' : action.kind === 'location' ? setLocation(udid, action.value) : action.kind === 'tap' ? await tap(udid, action.value) : action.kind === 'open' ? (openUrl(udid, action.value), 'opened') : typeText(udid, action.value);
      actionAttempts.push({ action: action.kind, value: action.kind === 'type' ? `${action.value.length} characters` : action.value, result });
    } catch {
      failedTaps.push(`${action.kind} "${action.value}"`);
      break;
    }
    await sleep(action.kind === 'open' ? 3000 : 1000);
  }
  for (const label of proof.tap ?? []) {
    try {
      await tap(udid, label);
    } catch {
      failedTaps.push(`tap "${label}"`);
      break;
    }
    await sleep(1000);
  }
  const gestureAttempts: GestureAttempt[] = [];
  if (proof.gesture === 'back' && failedTaps.length === 0) {
    gestureAttempts.push({ gesture: 'back', result: swipeBack(udid) });
    await sleep(1000);
  }
  const result = await waitForLabels(udid, proof.expect, failedTaps.length > 0 ? 1 : proof.wait);
  result.missing = [...failedTaps, ...result.missing];
  if (proof.absent?.length && result.missing.length === 0) {
    const shown = await watchForLabels(udid, proof.absent, absentWatchSeconds);
    result.missing.push(...shown.map((label) => `absent "${label}" was shown`));
  }
  let relaunchAttempt: RelaunchAttempt | undefined;
  if (proof.relaunchAfterExpect && result.missing.length === 0) {
    screenshot(udid, join(dir, `${proof.name}.before-relaunch.png`));
    await relaunch(udid);
    const expected = proof.afterRelaunchExpect ?? [];
    const after = await waitForLabels(udid, expected, proof.wait);
    relaunchAttempt = { before: proof.expect, after: expected, ok: after.missing.length === 0 };
    result.missing = after.missing;
    result.nodes = after.nodes;
  }
  const routeAttempts: RouteAttempt[] = [];
  const notificationAttempts: NotificationAttempt[] = [];
  if (proof.denyRoutes === 'protected' && result.missing.length === 0) {
    for (const candidate of protectedAppRoutes()) {
      openUrl(udid, candidate.href);
      await sleep(500);
      const denied = await waitForLabels(udid, proof.denyExpect ?? [], proof.wait);
      routeAttempts.push({ ...candidate, ok: denied.missing.length === 0, missing: denied.missing });
      out.info(`${candidate.href}  ${denied.missing.length === 0 ? 'denied' : `missing: ${denied.missing.join(', ')}`}`);
      result.missing.push(...denied.missing.map((label) => `${candidate.href}: ${label}`));
      if (denied.missing.length > 0) break;
    }
  }
  if (proof.notifications?.length && result.missing.length === 0) {
    for (const destination of proof.notifications) {
      openUrl(udid, `/dev?notification=${destination}`);
      await sleep(500);
      const denied = await waitForLabels(udid, proof.notificationExpect ?? [], proof.wait);
      notificationAttempts.push({ destination, ok: denied.missing.length === 0, missing: denied.missing });
      out.info(`notification ${destination}  ${denied.missing.length === 0 ? 'denied' : `missing: ${denied.missing.join(', ')}`}`);
      result.missing.push(...denied.missing.map((label) => `notification ${destination}: ${label}`));
      if (denied.missing.length > 0) break;
    }
  }
  if ((proof.thenTap?.length || proof.thenOpen || proof.thenExpect?.length) && result.missing.length === 0) {
    screenshot(udid, join(dir, `${proof.name}.before.png`));
    for (const label of proof.thenTap ?? []) {
      try {
        await tap(udid, label);
      } catch {
        result.missing.push(`tap "${label}"`);
        break;
      }
      await sleep(1000);
    }
    if (proof.thenOpen && result.missing.length === 0) {
      openUrl(udid, proof.thenOpen);
      await sleep(1500);
    }
    const then = await waitForLabels(udid, proof.thenExpect ?? [], proof.wait);
    result.missing = [...result.missing, ...then.missing];
    result.nodes = then.nodes;
  }
  const shot = screenshot(udid, join(dir, `${proof.name}.png`));
  const treePath = join(dir, `${proof.name}.labels.txt`);
  writeFileSync(treePath, labels(result.nodes).join('\n'));
  return { proof: `${feature}/${proof.name}`, ok: result.missing.length === 0, missing: result.missing, screenshot: shot, tree: treePath, ...(actionAttempts.length ? { actionAttempts } : {}), ...(routeAttempts.length ? { routeAttempts } : {}), ...(notificationAttempts.length ? { notificationAttempts } : {}), ...(gestureAttempts.length ? { gestureAttempts } : {}), ...(relaunchAttempt ? { relaunchAttempt } : {}) };
}

export async function proveCommand(args: string[]): Promise<number> {
  const only = option(args, 'proof');
  const [id] = args;
  if (!id) throw new UsageError(help);
  const feature = findFeature(id);
  const proofs = feature.proofs.filter((proof) => !only || proof.name === only);
  if (proofs.length === 0) throw new UsageError(`${id} has no proof${only ? ` named ${only}` : ''}; add a \`\`\`proof block to ${rel(feature.file)}`);
  const dir = stateDir('proof', id, timestamp());
  const outcomes: Outcome[] = [];
  for (const proof of proofs) {
    const outcome = await runProof(id, proof, dir);
    outcomes.push(outcome);
    if (outcome.ok) out.ok(`${outcome.proof}  ${rel(outcome.screenshot)}`);
    else {
      out.fail(`${outcome.proof}  missing: ${outcome.missing.join(', ')}`);
      out.info(`screen: ${rel(outcome.screenshot)}  labels: ${rel(outcome.tree)}`);
    }
  }
  const commit = run('git', ['rev-parse', '--short', 'HEAD']).stdout.trim();
  const dirty = run('git', ['status', '--porcelain']).stdout.trim() !== '';
  writeFileSync(join(dir, 'result.json'), `${JSON.stringify({ feature: id, commit, dirty, at: new Date().toISOString(), outcomes }, null, 2)}\n`);
  console.log(`\nevidence: ${rel(dir)}`);
  return outcomes.every((outcome) => outcome.ok) ? 0 : 1;
}
