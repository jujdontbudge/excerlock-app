import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const script = path.resolve('scripts/measure-startup.sh');

// Legacy attribute-only shape: enough to prove the export plumbing and that a
// partial trace still produces numbers with a missing-stage warning.
const LEGACY_EXPORT =
  '<trace><row name="AppDelegateEntry" timestamp="10"/><row name="FirstReactChildMount" timestamp="10.4"/><row name="InteractiveHome" timestamp="10.9"/></trace>';

/** Two cold launches in the accepted xctrace os-signpost shape: typed columns,
 * `<pid>` per launch and one `MM:SS.ffffff` timestamp to cover both time forms. */
const MULTI_LAUNCH_EXPORT = `<?xml version="1.0" encoding="UTF-8"?>
<trace-query-result>
  <node xpath='/trace-toc/run[@number="1"]/data/table[@schema="os-signpost"]'>
    <row>
      <event-time id="1" fmt="00:00:10.000000">10.000000</event-time>
      <pid id="2" fmt="101">101</pid>
      <os-signpost id="3" fmt="AppDelegateEntry">AppDelegateEntry</os-signpost>
    </row>
    <row>
      <event-time id="1" fmt="00:00:10.400000">10.400000</event-time>
      <pid id="2" fmt="101">101</pid>
      <os-signpost id="3" fmt="FirstReactRender">FirstReactRender</os-signpost>
    </row>
    <row>
      <event-time id="1" fmt="00:00:10.700000">10.700000</event-time>
      <pid id="2" fmt="101">101</pid>
      <os-signpost id="3" fmt="HydrationDone">HydrationDone</os-signpost>
    </row>
    <row>
      <event-time id="1" fmt="00:00:11.100000">11.100000</event-time>
      <pid id="2" fmt="101">101</pid>
      <os-signpost id="3" fmt="RuntimeReady">RuntimeReady</os-signpost>
    </row>
    <row>
      <event-time id="1" fmt="00:00:11.130000">11.130000</event-time>
      <pid id="2" fmt="101">101</pid>
      <os-signpost id="3" fmt="BootGateRedirect">BootGateRedirect</os-signpost>
    </row>
    <row>
      <event-time id="1" fmt="00:00:11.400000">11.400000</event-time>
      <pid id="2" fmt="101">101</pid>
      <os-signpost id="3" fmt="InteractiveHome">InteractiveHome</os-signpost>
    </row>
    <row>
      <event-time id="1" fmt="00:00:20.000000">00:00:20.000000</event-time>
      <pid id="2" fmt="102">102</pid>
      <os-signpost id="3" fmt="AppDelegateEntry">AppDelegateEntry</os-signpost>
    </row>
    <row>
      <event-time id="1" fmt="00:00:20.600000">20.600000</event-time>
      <pid id="2" fmt="102">102</pid>
      <os-signpost id="3" fmt="FirstReactRender">FirstReactRender</os-signpost>
    </row>
    <row>
      <event-time id="1" fmt="00:00:20.900000">20.900000</event-time>
      <pid id="2" fmt="102">102</pid>
      <os-signpost id="3" fmt="HydrationDone">HydrationDone</os-signpost>
    </row>
    <row>
      <event-time id="1" fmt="00:00:21.200000">21.200000</event-time>
      <pid id="2" fmt="102">102</pid>
      <os-signpost id="3" fmt="RuntimeReady">RuntimeReady</os-signpost>
    </row>
    <row>
      <event-time id="1" fmt="00:00:21.260000">21.260000</event-time>
      <pid id="2" fmt="102">102</pid>
      <os-signpost id="3" fmt="BootGateRedirect">BootGateRedirect</os-signpost>
    </row>
    <row>
      <event-time id="1" fmt="00:00:21.600000">21.600000</event-time>
      <pid id="2" fmt="102">102</pid>
      <os-signpost id="3" fmt="InteractiveHome">InteractiveHome</os-signpost>
    </row>
  </node>
</trace-query-result>
`;

/** Two cold launches in the shape a real `xcrun xctrace export` writes: one
 * `<process id fmt>` definition per launch that the rows reference (`ref`), the
 * exact signpost name declared once and referenced later (`<signpost-name
 * ref>`), `MM:SS.fff.uuu` formatted clocks next to raw nanosecond text, and the
 * legacy `DelegateToInteractiveHome` interval whose text contains the
 * `InteractiveHome` stage name. */
const REAL_TRACE_EXPORT = `<?xml version="1.0"?>
<trace-query-result>
<node xpath='//trace-toc[1]/run[1]/data[1]/table[1]'><process id="4" fmt="ExcerLock (20461)"/><process id="9" fmt="ExcerLock (20500)"/><subsystem id="42" fmt="com.johansardar.excerlock.startup"/><signpost-name id="51" fmt="AppDelegateEntry">AppDelegateEntry</signpost-name><signpost-name id="52" fmt="FirstReactRender">FirstReactRender</signpost-name><signpost-name id="53" fmt="HydrationDone">HydrationDone</signpost-name><signpost-name id="54" fmt="RuntimeReady">RuntimeReady</signpost-name><signpost-name id="55" fmt="BootGateRedirect">BootGateRedirect</signpost-name><signpost-name id="56" fmt="DelegateToInteractiveHome">DelegateToInteractiveHome</signpost-name>
<row><event-time id="39" fmt="00:00.905.375">905375791</event-time><process ref="4"/><signpost-name ref="56"/><subsystem ref="42"/></row>
<row><event-time id="49" fmt="00:00.905.380">905380625</event-time><process ref="4"/><signpost-name ref="51"/><subsystem ref="42"/></row>
<row><event-time id="331" fmt="00:01.172.622">1172622083</event-time><process ref="4"/><signpost-name ref="52"/><subsystem ref="42"/></row>
<row><event-time id="332" fmt="00:01.173.100">1173100000</event-time><process ref="4"/><signpost-name ref="53"/><subsystem ref="42"/></row>
<row><event-time id="333" fmt="00:01.175.200">1175200000</event-time><process ref="4"/><signpost-name ref="54"/><subsystem ref="42"/></row>
<row><event-time id="334" fmt="00:01.175.300">1175300000</event-time><process ref="4"/><signpost-name ref="55"/><subsystem ref="42"/></row>
<row><event-time id="335" fmt="00:10.000.000">10000000000</event-time><process ref="9"/><signpost-name ref="51"/><subsystem ref="42"/></row>
<row><event-time id="336" fmt="00:10.200.000">10200000000</event-time><process ref="9"/><signpost-name ref="52"/><subsystem ref="42"/></row>
<row><event-time id="337" fmt="00:10.400.000">10400000000</event-time><process ref="9"/><signpost-name ref="53"/><subsystem ref="42"/></row>
<row><event-time id="338" fmt="00:10.500.000">10500000000</event-time><process ref="9"/><signpost-name ref="54"/><subsystem ref="42"/></row>
<row><event-time id="339" fmt="00:10.520.000">10520000000</event-time><process ref="9"/><signpost-name ref="55"/><subsystem ref="42"/></row>
</node></trace-query-result>
`;

function runMeasure(exportXml: string) {
  const dir = mkdtempSync(path.join(tmpdir(), 'measure-startup-'));
  const trace = path.join(dir, 'capture.trace');
  const bin = path.join(dir, 'bin');
  const output = path.join(dir, 'output');
  const calls = path.join(dir, 'xcrun-calls');
  const fixture = path.join(dir, 'fixture.xml');
  mkdirSync(trace);
  mkdirSync(bin);
  writeFileSync(fixture, exportXml);
  const xcrun = path.join(bin, 'xcrun');
  writeFileSync(
    xcrun,
    `#!/bin/bash\nprintf '%s\\n' "$*" >> "$CALLS"\nout=\${!#}\nif [[ "$*" == *" --xpath "* ]]; then\n  cat "$FIXTURE" > "$out"\nelse\n  printf '%s\\n' '<trace/>' > "$out"\nfi\n`,
  );
  chmodSync(xcrun, 0o755);

  const result = spawnSync(script, ['--trace', trace, '--xpath', '/trace-toc/run', '--output', output], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, CALLS: calls, FIXTURE: fixture },
  });
  return { result, output, calls, trace };
}

function readJson(file: string) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

/** One `log show --signpost --style ndjson` row as the simulator writes it. */
function signpostRow(
  processID: number,
  signpostName: string,
  signpostType: string,
  machTimestamp: number,
): string {
  return JSON.stringify({
    eventType: 'signpostEvent',
    subsystem: 'com.johansardar.excerlock.startup',
    category: 'PointsOfInterest',
    processID,
    signpostName,
    signpostType,
    timestamp: new Date(1_760_000_000_000 + machTimestamp / 1e6).toISOString(),
    machTimestamp,
  });
}

/** Two cold launches of the app as the simulator's unified log records them:
 * `event`/`begin`/`end` rows for the same stage, the legacy
 * `DelegateToInteractiveHome` interval (not a stage) and `log show`'s trailing
 * summary object that is not a signpost at all. */
const SIM_LOG_CAPTURE = [
  '{"count":999,"finished":1}',
  signpostRow(101, 'AppDelegateEntry', 'event', 1_000_000_000),
  signpostRow(101, 'DelegateToInteractiveHome', 'begin', 1_000_000_200),
  signpostRow(101, 'FirstReactChildMount', 'event', 1_050_000_000),
  signpostRow(101, 'AppDelegateEntry', 'end', 1_050_000_100),
  signpostRow(101, 'HydrationDone', 'event', 1_051_000_000),
  signpostRow(101, 'RuntimeReady', 'event', 1_054_000_000),
  signpostRow(101, 'BootGateRedirect', 'event', 1_055_000_000),
  signpostRow(202, 'AppDelegateEntry', 'event', 2_000_000_000),
  signpostRow(202, 'DelegateToInteractiveHome', 'begin', 2_000_000_200),
  signpostRow(202, 'FirstReactChildMount', 'event', 2_060_000_000),
  signpostRow(202, 'HydrationDone', 'event', 2_062_000_000),
  signpostRow(202, 'RuntimeReady', 'event', 2_064_000_000),
  signpostRow(202, 'BootGateRedirect', 'event', 2_066_000_000),
  '{"count":13,"finished":1}',
].join('\n');

function runSimLog(capture: string) {
  const dir = mkdtempSync(path.join(tmpdir(), 'measure-startup-log-'));
  const bin = path.join(dir, 'bin');
  const output = path.join(dir, 'output');
  const calls = path.join(dir, 'xcrun-calls');
  const fixture = path.join(dir, 'capture.ndjson');
  mkdirSync(bin);
  writeFileSync(fixture, capture);
  const xcrun = path.join(bin, 'xcrun');
  writeFileSync(xcrun, '#!/bin/bash\nprintf \'%s\\n\' "$*" >> "$CALLS"\ncat "$FIXTURE"\n');
  chmodSync(xcrun, 0o755);

  const result = spawnSync(
    script,
    ['--sim-log', 'SIM-UDID', '--since', '2026-09-17 13:00:00', '--output', output],
    { encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, CALLS: calls, FIXTURE: fixture } },
  );
  return { result, output, calls };
}

test('missing option value exits with usage status', () => {
  const result = spawnSync(script, ['--trace'], { encoding: 'utf8' });
  expect(result.status).toBe(64);
  expect(result.stderr).toContain('usage: measure-startup.sh');
});

test('accepts an xctrace package directory as input and reports numeric medians', () => {
  const { result, output, calls, trace } = runMeasure(LEGACY_EXPORT);

  expect(result.status).toBe(0);
  expect(readFileSync(calls, 'utf8')).toContain(`xctrace export --input ${trace}`);
  expect(result.stdout).toContain('FirstReactRender');
  expect(result.stderr).toContain('missing stages in export: HydrationDone, RuntimeReady, BootGateRedirect');
  const medians = readJson(path.join(output, 'stage-medians.json'));
  expect(medians.launches).toBe(1);
  expect(medians.stages.FirstReactRender).toEqual({ samples: 1, median_step_ms: 400, median_cumulative_ms: 400 });
  expect(medians.stages.InteractiveHome).toEqual({ samples: 1, median_step_ms: 500, median_cumulative_ms: 900 });
  expect(readJson(path.join(output, 'diagnostic.json')).numeric_timing_verified).toBe(true);
});

test('prints per-stage medians across multiple launches in the export', () => {
  const { result, output } = runMeasure(MULTI_LAUNCH_EXPORT);

  expect(result.status).toBe(0);
  expect(result.stdout).toContain('across 2 launch(es)');
  const medians = readJson(path.join(output, 'stage-medians.json'));
  expect(medians.launches).toBe(2);
  expect(medians.missing_stages).toEqual([]);
  expect(medians.stages).toEqual({
    FirstReactRender: { samples: 2, median_step_ms: 500, median_cumulative_ms: 500 },
    HydrationDone: { samples: 2, median_step_ms: 300, median_cumulative_ms: 800 },
    RuntimeReady: { samples: 2, median_step_ms: 350, median_cumulative_ms: 1150 },
    BootGateRedirect: { samples: 2, median_step_ms: 45, median_cumulative_ms: 1195 },
    InteractiveHome: { samples: 2, median_step_ms: 305, median_cumulative_ms: 1500 },
  });
  expect(existsSync(path.join(output, 'signposts.xml'))).toBe(true);
});

test('reads a real xctrace export with shared refs into per-launch medians', () => {
  const { result, output } = runMeasure(REAL_TRACE_EXPORT);

  expect(result.status).toBe(0);
  expect(result.stdout).toContain('across 2 launch(es)');
  const medians = readJson(path.join(output, 'stage-medians.json'));
  expect(medians.launches).toBe(2);
  // The legacy DelegateToInteractiveHome interval is not the InteractiveHome
  // stage, and raw nanosecond text must not be read as seconds: the refs,
  // formatted clocks and per-launch process keys carry the numbers instead.
  expect(medians.stages).toEqual({
    FirstReactRender: { samples: 2, median_step_ms: 233.621, median_cumulative_ms: 233.621 },
    HydrationDone: { samples: 2, median_step_ms: 100.239, median_cumulative_ms: 333.86 },
    RuntimeReady: { samples: 2, median_step_ms: 51.05, median_cumulative_ms: 384.91 },
    BootGateRedirect: { samples: 2, median_step_ms: 10.05, median_cumulative_ms: 394.96 },
  });
  expect(medians.missing_stages).toEqual(['InteractiveHome']);
});

test('reads the simulator unified log capture into per-launch stage medians', () => {
  const { result, output, calls } = runSimLog(SIM_LOG_CAPTURE);

  expect(result.status).toBe(0);
  const logged = readFileSync(calls, 'utf8');
  expect(logged).toContain('simctl spawn SIM-UDID log show --start 2026-09-17 13:00:00');
  // `--signpost` is singular: `--signposts` is rejected and captures nothing.
  expect(logged).toContain('--signpost --style ndjson');
  expect(logged).not.toContain('--signposts');

  const medians = readJson(path.join(output, 'stage-medians.json'));
  expect(medians.capture).toBe('ndjson');
  // Two launches: the pids are distinct, and `log show`'s summary objects are
  // not signposts.
  expect(medians.launches).toBe(2);
  expect(medians.missing_stages).toEqual(['InteractiveHome']);
  expect(medians.stages).toEqual({
    FirstReactRender: { samples: 2, median_step_ms: 55, median_cumulative_ms: 55 },
    HydrationDone: { samples: 2, median_step_ms: 1.5, median_cumulative_ms: 56.5 },
    RuntimeReady: { samples: 2, median_step_ms: 2.5, median_cumulative_ms: 59 },
    BootGateRedirect: { samples: 2, median_step_ms: 1.5, median_cumulative_ms: 60.5 },
  });

  const diagnostic = readJson(path.join(output, 'diagnostic.json'));
  expect(diagnostic.capture_source).toBe('simulator-unified-log');
  expect(diagnostic.simulator_numbers).toBe(true);
  expect(diagnostic.full_cold_launch_verified).toBe(false);
});

test('fails closed on a capture that carries no startup stages', () => {
  const { result, output } = runSimLog('{"count":1,"finished":1}\n');

  expect(result.status).toBe(3);
  expect(result.stderr).toContain('no os_signpost startup stage events found');
  expect(existsSync(path.join(output, 'stage-medians.json'))).toBe(false);
});
