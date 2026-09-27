import { must } from '../lib/shell.ts';
import { option, UsageError } from '../lib/shell.ts';
import { scenarioIds } from '../lib/features.ts';
import {
  appCandidates,
  boot,
  ensureApp,
  ensureCompanion,
  install,
  installed,
  labels,
  metroLog,
  metroPort,
  metroRunning,
  relaunch,
  openUrl,
  ownedDevice,
  screenshot,
  shutdown,
  startMetro,
  stopMetro,
  tap,
  tree,
  waitForLabels,
} from '../lib/sim.ts';
import { sleep } from '../lib/shell.ts';

export const simHelp = `excer sim <command>

Drives the one simulator excer owns (ExcerLock-Next, or EXCER_SIM=<name|udid>). Headless:
Simulator.app stays closed. Reuses the installed build; never rebuilds.
  status             simulator, app install, Metro and build candidates
  start              boot, install if missing, start Metro, open the dev client
  boot | shutdown    boot or shut down the owned simulator
  install [app]      install the newest build (or the given .app)
  open <path|url>    open a deep link; /home becomes excerlock://home
  shot [file]        screenshot; prints the path
  tree [--raw]       accessibility labels on screen (--raw: full JSON)
  tap <label>        tap the element whose label contains <label>
  type <text>        type into the focused field
  wait <label>...    wait up to 15 s until every label is on screen
  metro start|stop|log`;

export const demoHelp = `excer demo <scenario> [--open <path>] [--prompt grant|deny|ask]
excer demo list

Starts the app with a scripted demo scenario (fake adapters, same code paths) and
optionally opens a route. The app cold-launches before the load so no screen state\nleaks between scenarios. Fake system prompts auto-grant unless --prompt says otherwise.\nScenario ids live in app-next/src/packages/dev-harness/lib/scenarios.`;

export async function simCommand(args: string[]): Promise<number> {
  const [command, ...rest] = args;
  switch (command) {
    case 'status': {
      const device = ownedDevice();
      console.log(`simulator  ${device.name} ${device.udid} ${device.state}`);
      console.log(`app        ${device.state === 'Booted' ? (installed(device.udid) ? 'installed' : 'not installed') : 'unknown (simulator not booted)'}`);
      console.log(`metro      ${(await metroRunning()) ? `running on :${metroPort}` : 'stopped'}`);
      console.log(`builds     ${appCandidates().join('\n           ') || 'none found'}`);
      return 0;
    }
    case 'start':
      console.log(`ready: ${(await ensureApp()).name}`);
      return 0;
    case 'boot':
      console.log(`booted: ${(await boot()).name}`);
      return 0;
    case 'shutdown':
      console.log(shutdown());
      return 0;
    case 'install':
      console.log(`installed ${install((await boot()).udid, rest[0])}`);
      return 0;
    case 'open':
      if (!rest[0]) throw new UsageError('excer sim open <path|url>');
      console.log(`opened ${openUrl(ownedDevice().udid, rest[0])}`);
      return 0;
    case 'shot':
      console.log(screenshot(ownedDevice().udid, rest[0]));
      return 0;
    case 'tree': {
      const nodes = tree(ownedDevice().udid);
      console.log(rest.includes('--raw') ? JSON.stringify(nodes, null, 2) : labels(nodes).join('\n'));
      return 0;
    }
    case 'tap':
      if (!rest[0]) throw new UsageError('excer sim tap <label>');
      console.log(await tap(ownedDevice().udid, rest.join(' ')));
      return 0;
    case 'type':
      ensureCompanion(ownedDevice().udid);
      must('idb', ['ui', 'text', '--udid', ownedDevice().udid, rest.join(' ')]);
      console.log('typed');
      return 0;
    case 'wait': {
      const result = await waitForLabels(ownedDevice().udid, rest, 15);
      if (result.missing.length > 0) {
        console.log(`missing: ${result.missing.join(', ')}`);
        return 1;
      }
      console.log('all labels present');
      return 0;
    }
    case 'metro':
      if (rest[0] === 'start') console.log(await startMetro());
      else if (rest[0] === 'stop') console.log(stopMetro());
      else if (rest[0] === 'log') console.log(metroLog());
      else throw new UsageError('excer sim metro start|stop|log');
      return 0;
    default:
      throw new UsageError(simHelp);
  }
}

export async function loadScenario(scenario: string, open?: string, prompt = 'grant', coldAfter = false): Promise<string> {
  if (!scenarioIds().includes(scenario)) throw new UsageError(`Unknown scenario "${scenario}". Run: excer demo list`);
  const device = await ensureApp();
  await relaunch(device.udid);
  openUrl(device.udid, `dev?scenario=${encodeURIComponent(scenario)}&prompt=${encodeURIComponent(prompt)}`);
  await sleep(3000);
  if (coldAfter) {
    await sleep(3000);
    await relaunch(device.udid);
  }
  if (open) {
    openUrl(device.udid, open);
    await sleep(1500);
  }
  return device.udid;
}

export async function demoCommand(args: string[]): Promise<number> {
  const [scenario, ...rest] = args;
  if (!scenario) throw new UsageError(demoHelp);
  if (scenario === 'list') {
    console.log(scenarioIds().join('\n'));
    return 0;
  }
  const open = option(rest, 'open');
  await loadScenario(scenario, open, option(rest, 'prompt') ?? 'grant');
  console.log(`loaded ${scenario}. Next: excer sim tree, excer sim shot`);
  return 0;
}
