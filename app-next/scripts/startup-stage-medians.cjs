#!/usr/bin/env node
// Numeric stage medians for `scripts/measure-startup.sh`.
//
// Two input shapes are accepted, auto-detected from the content:
//
//   * `xcrun xctrace export --xpath ...` XML (the `os-signpost` table) — the
//     trace path `measure-startup.sh --trace/--xpath` uses.
//   * `xcrun simctl spawn <udid> log show --signpost --style ndjson` rows — the
//     simulator path `measure-startup.sh --sim-log` uses. Stage rows are matched
//     on `signpostName`, timed by `machTimestamp` (nanoseconds since boot) and
//     keyed per launch by `processID`.
//
// The parser is deliberately schema-tolerant because no real xctrace export is
// committed as a fixture yet:
//
//   * A stage row is any <row> whose serialized text contains one of the
//     signpost event names emitted by modules/excerlock-startup
//     (FirstReactRender / FirstReactChildMount / HydrationDone / RuntimeReady /
//     BootGateRedirect / InteractiveHome).
//   * Its time comes from the first of these attributes or child elements that
//     parses: timestamp, event-time, start-time, time, date. Values may be
//     seconds ("12.345"), "MM:SS.ffffff", or "HH:MM:SS.ffffff".
//   * Rows are grouped by the process/pid column when present, otherwise the
//     whole export is one launch. Each launch contributes one sample per stage;
//     a launch's step time for a stage is the distance from the previous stage
//     it actually reported (skipped stages do not invent samples).
//
// Output: a per-stage median table in milliseconds plus a JSON document with
// the same numbers. This is a delegate-relative diagnostic, not process-launch
// or first-frame time (ADR 0021); a signed Release build on the target device
// remains the budget gate.

const fs = require('node:fs');

const ORDER = [
  'AppDelegateEntry',
  'FirstReactRender',
  'HydrationDone',
  'RuntimeReady',
  'BootGateRedirect',
  'InteractiveHome',
];

// Legacy native event name for the same boundary as FirstReactRender.
const EVENT_TO_STAGE = {
  AppDelegateEntry: 'AppDelegateEntry',
  FirstReactRender: 'FirstReactRender',
  FirstReactChildMount: 'FirstReactRender',
  HydrationDone: 'HydrationDone',
  RuntimeReady: 'RuntimeReady',
  BootGateRedirect: 'BootGateRedirect',
  InteractiveHome: 'InteractiveHome',
};

const TIME_ATTRIBUTES = new Set([
  'timestamp',
  'event-time',
  'eventtime',
  'start-time',
  'start',
  'starttime',
  'time',
  'date',
]);

function usage() {
  process.stderr.write(
    'usage: startup-stage-medians.cjs <signposts.xml|signposts.ndjson> [--json <output.json>]\n',
  );
  process.exit(64);
}

function parseArguments(argv) {
  let input = null;
  let jsonOutput = null;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--json') {
      jsonOutput = argv[index + 1];
      if (!jsonOutput) usage();
      index += 1;
    } else if (argument.startsWith('-')) {
      usage();
    } else if (input === null) {
      input = argument;
    } else {
      usage();
    }
  }
  if (!input) usage();
  return { input, jsonOutput };
}

/** Seconds from a numeric or colon-separated timestamp, or null. */
function parseTime(value) {
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (/^\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  const parts = trimmed.split(':');
  if (parts.length < 2 || parts.length > 3 || parts.some((part) => !/^\d+(\.\d+)?$/.test(part))) return null;
  const seconds = Number(parts.pop());
  const minutes = Number(parts.pop());
  const hours = parts.length ? Number(parts.pop()) : 0;
  return hours * 3600 + minutes * 60 + seconds;
}

function firstTimestamp(row) {
  for (const match of row.matchAll(/([A-Za-z_][\w-]*)\s*=\s*"([^"]*)"/g)) {
    if (!TIME_ATTRIBUTES.has(match[1].toLowerCase())) continue;
    const value = parseTime(match[2]);
    if (value !== null) return value;
  }
  for (const match of row.matchAll(/<(event-time|start-time|timestamp|time|date)\b[^>]*>([^<]*)<\/\1>/gi)) {
    const value = parseTime(match[2]);
    if (value !== null) return value;
  }
  return null;
}

function firstStage(row) {
  let winner = null;
  let winnerIndex = Infinity;
  for (const event of Object.keys(EVENT_TO_STAGE)) {
    const index = row.indexOf(event);
    if (index >= 0 && index < winnerIndex) {
      winner = EVENT_TO_STAGE[event];
      winnerIndex = index;
    }
  }
  return winner;
}

/** Stable per-launch key from the pid/process column, when the export has one.
 * pid wins: two launches of the same app share a process name but never a pid.
 */
function launchKey(row) {
  const attributes = new Map();
  for (const match of row.matchAll(/([A-Za-z_][\w-]*)\s*=\s*"([^"]*)"/g)) {
    attributes.set(match[1].toLowerCase(), match[2].trim());
  }
  for (const name of ['pid', 'processid']) {
    if (attributes.get(name)) return `pid:${attributes.get(name)}`;
  }
  for (const name of ['process', 'process-name']) {
    if (attributes.get(name)) return `process:${attributes.get(name)}`;
  }
  const elements = new Map();
  for (const match of row.matchAll(/<(pid|processid|process|process-name)\b[^>]*>([^<]*)<\/\1>/gi)) {
    elements.set(match[1].toLowerCase(), match[2].trim());
  }
  for (const name of ['pid', 'processid']) {
    if (elements.get(name)) return `pid:${elements.get(name)}`;
  }
  for (const name of ['process', 'process-name']) {
    if (elements.get(name)) return `process:${elements.get(name)}`;
  }
  return 'launch';
}

function collectLaunches(xml) {
  const launches = new Map();
  const rows = xml.match(/<row\b[^>]*>[\s\S]*?<\/row>|<row\b[^>]*\/>/g) ?? [];
  for (const row of rows) {
    const stage = firstStage(row);
    if (!stage) continue;
    const time = firstTimestamp(row);
    if (time === null) continue;
    const key = launchKey(row);
    const stages = launches.get(key) ?? {};
    if (stages[stage] === undefined || time < stages[stage]) stages[stage] = time;
    launches.set(key, stages);
  }
  return launches;
}

/** Seconds for one `log show --signpost --style ndjson` row, or null.
 *
 * `machTimestamp` (nanoseconds on the device's monotonic clock) is the precise
 * basis; the ISO `timestamp` is the fallback for rows that carry one alone.
 * Only differences between stages are ever reported, so either basis works as
 * long as every row of one launch is timed the same way.
 */
function ndjsonTime(row) {
  if (typeof row.machTimestamp === 'number' && Number.isFinite(row.machTimestamp)) {
    return row.machTimestamp / 1e9;
  }
  if (typeof row.timestamp === 'string') {
    const epoch = Date.parse(row.timestamp);
    return Number.isFinite(epoch) ? epoch / 1000 : null;
  }
  return null;
}

/** Same launch map as the XML path, built from the simulator's unified log. */
function collectLaunchesFromNdjson(text) {
  const launches = new Map();
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;
    let row;
    try {
      row = JSON.parse(trimmed);
    } catch {
      continue;
    }
    const stage = EVENT_TO_STAGE[row.signpostName];
    if (!stage) continue;
    const time = ndjsonTime(row);
    if (time === null) continue;
    const key = row.processID === undefined ? 'launch' : `pid:${row.processID}`;
    const stages = launches.get(key) ?? {};
    if (stages[stage] === undefined || time < stages[stage]) stages[stage] = time;
    launches.set(key, stages);
  }
  return launches;
}

function captureShape(text) {
  const trimmed = text.trimStart();
  if (trimmed.startsWith('[')) return 'json-array';
  if (trimmed.startsWith('{')) return 'ndjson';
  return 'xml';
}

/** Launch map for whichever capture shape the input is. */
function readCapture(text) {
  const shape = captureShape(text);
  if (shape === 'xml') return { shape, launches: collectLaunches(text) };
  if (shape === 'json-array') {
    let rows;
    try {
      rows = JSON.parse(text);
    } catch (error) {
      process.stderr.write(`cannot parse JSON capture: ${error.message}\n`);
      process.exit(2);
    }
    const ndjson = (Array.isArray(rows) ? rows : []).map((row) => JSON.stringify(row)).join('\n');
    return { shape: 'json-array', launches: collectLaunchesFromNdjson(ndjson) };
  }
  return { shape, launches: collectLaunchesFromNdjson(text) };
}

function median(samples) {
  const sorted = [...samples].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function summarize(launches) {
  const steps = new Map(ORDER.map((stage) => [stage, []]));
  const cumulatives = new Map(ORDER.map((stage) => [stage, []]));
  for (const stages of launches.values()) {
    const present = ORDER.filter((stage) => stages[stage] !== undefined);
    if (!present.length) continue;
    const baseline = stages.AppDelegateEntry ?? stages[present[0]];
    let previous = null;
    for (const stage of present) {
      if (previous !== null) steps.get(stage).push((stages[stage] - previous) * 1000);
      cumulatives.get(stage).push((stages[stage] - baseline) * 1000);
      previous = stages[stage];
    }
  }
  const result = {};
  for (const stage of ORDER) {
    if (stage === 'AppDelegateEntry') continue;
    const stepSamples = steps.get(stage);
    const cumulativeSamples = cumulatives.get(stage);
    if (!stepSamples.length && !cumulativeSamples.length) continue;
    result[stage] = {
      samples: cumulativeSamples.length,
      median_step_ms: stepSamples.length ? round(median(stepSamples)) : null,
      median_cumulative_ms: cumulativeSamples.length ? round(median(cumulativeSamples)) : null,
    };
  }
  return result;
}

function formatTable(stages, launchCount) {
  const lines = [`Startup stage medians (ms) across ${launchCount} launch(es), relative to AppDelegate entry`];
  lines.push('stage                 step    cumulative  samples');
  for (const stage of ORDER) {
    if (stage === 'AppDelegateEntry' || !stages[stage]) continue;
    const { median_step_ms: step, median_cumulative_ms: cumulative, samples } = stages[stage];
    lines.push(
      `${stage.padEnd(20)} ${String(step ?? '-').padStart(7)} ${String(cumulative ?? '-').padStart(11)} ${String(samples).padStart(8)}`,
    );
  }
  return lines.join('\n');
}

const { input, jsonOutput } = parseArguments(process.argv.slice(2));
let xml;
try {
  xml = fs.readFileSync(input, 'utf8');
} catch (error) {
  process.stderr.write(`cannot read ${input}: ${error.message}\n`);
  process.exit(2);
}

const capture = readCapture(xml);
const launches = capture.launches;
const stages = summarize(launches);
const stageNames = Object.keys(stages);
if (!stageNames.length) {
  process.stderr.write(`no os_signpost startup stage events found in ${input}\n`);
  process.exit(3);
}

const missing = ORDER.filter((stage) => stage !== 'AppDelegateEntry' && !stages[stage]);
process.stdout.write(`${formatTable(stages, launches.size)}\n`);
if (missing.length) {
  process.stderr.write(`warning: missing stages in export: ${missing.join(', ')}\n`);
}

const document = {
  schema: 'startup-stage-medians/1',
  origin: 'AppDelegate entry (not process launch)',
  capture: capture.shape,
  launches: launches.size,
  baseline: launches.size ? 'AppDelegateEntry when present, else the first reported stage' : null,
  units: 'milliseconds',
  stages,
  missing_stages: missing,
  real_trace_validated: false,
  note:
    'Schema-tolerant parser; delegate-relative diagnostic, not process-launch or first-frame time (ADR 0021). The xctrace XML shape is still verified against the jest fixture only; the ndjson shape (simulator unified log) is verified against a real capture.',
};
if (jsonOutput) {
  fs.writeFileSync(jsonOutput, `${JSON.stringify(document, null, 2)}\n`);
}
