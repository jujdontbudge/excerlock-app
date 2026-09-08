#!/usr/bin/env node
'use strict';
/**
 * Verify a pulled device diagnostics log against the physical-device acceptance scenarios.
 *
 *   node scripts/verify-device-run.js <file-or-directory>... [--all] [--scenario <id>] [--json]
 *   node scripts/verify-device-run.js --list
 *
 * A file named after a scenario (`<scenario-id>.log`) is checked against that scenario only, and a missing
 * anchor counts as a failure: the tester claimed the run and the log holds no evidence. Any other file is
 * checked against every scenario and only those with evidence are printed; `--all` also prints the ones
 * that were not run. `--scenario <id>` forces one scenario for every file. The exit code is 1 when any
 * scenario fails.
 *
 * The event vocabulary is docs/verification/diagnostics-events.md; the runbook is
 * docs/verification/device-runbook.md.
 */
const fs = require('node:fs');
const path = require('node:path');
const { parseLog } = require('./device-run-log');
const { SCENARIOS, scenarioForFile } = require('./device-run-scenarios');

const LOG_EXTENSIONS = /\.(log|txt|jsonl|tsv)$/i;

function collectFiles(inputs) {
  const files = [];
  for (const input of inputs) {
    const stat = fs.statSync(input);
    if (stat.isDirectory()) {
      fs.readdirSync(input)
        .filter((name) => LOG_EXTENSIONS.test(name))
        .sort()
        .forEach((name) => files.push(path.join(input, name)));
    } else files.push(input);
  }
  return files;
}

/** Evaluates one log file; returns `{ file, malformed, results: [{ scenario, status, lines }] }`. */
function verifyFile(file, options = {}) {
  const { entries, malformed } = parseLog(fs.readFileSync(file, 'utf8'));
  const named = options.scenario ? SCENARIOS.find((s) => s.id === options.scenario) : scenarioForFile(path.basename(file));
  if (options.scenario && !named) throw new Error(`unknown scenario ${options.scenario}`);
  const chosen = named ? [named] : SCENARIOS;
  const results = chosen.map((scenario) => {
    const outcome = scenario.check(entries);
    // A file named for a scenario is a claim that it was run; no evidence is then a failure, not a skip.
    const status = named && outcome.status === 'skip' ? 'fail' : outcome.status;
    return { scenario, status, lines: outcome.lines };
  });
  return { file, entries: entries.length, malformed, results, named: Boolean(named) };
}

function formatReport(reports, options = {}) {
  const lines = [];
  const counts = { pass: 0, fail: 0, skip: 0 };
  for (const report of reports) {
    lines.push(`${path.basename(report.file)}: ${report.entries} entries${report.malformed.length ? `, ${report.malformed.length} malformed line(s) at ${report.malformed.slice(0, 5).join(', ')}` : ''}`);
    for (const { scenario, status, lines: detail } of report.results) {
      if (status === 'skip' && !options.all && !report.named) continue;
      counts[status] += 1;
      lines.push(`  ${label(status).padEnd(8)}${scenario.id} — ${scenario.title} (row ${scenario.rows.join(', ')})`);
      for (const line of detail) if (status !== 'skip' || options.all) lines.push(`        ${line}`);
    }
    if (!report.named && report.results.every((r) => r.status === 'skip')) lines.push('  no scenario has evidence in this file');
  }
  lines.push('');
  lines.push(`${counts.pass} pass, ${counts.fail} fail, ${counts.skip} not run`);
  return { text: lines.join('\n'), counts };
}

function label(status) {
  return status === 'pass' ? 'PASS' : status === 'fail' ? 'FAIL' : 'NOT RUN';
}

function listScenarios() {
  return SCENARIOS.map((s) => `${s.id.padEnd(40)} row ${s.rows.join(', ').padEnd(10)} ${s.title}`).join('\n');
}

function parseArgs(argv) {
  const options = { inputs: [], all: false, json: false, list: false, scenario: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--all') options.all = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--list') options.list = true;
    else if (arg === '--scenario') options.scenario = argv[(index += 1)];
    else options.inputs.push(arg);
  }
  return options;
}

function main(argv) {
  const options = parseArgs(argv.slice(2));
  if (options.list) {
    process.stdout.write(`${listScenarios()}\n`);
    return 0;
  }
  if (options.inputs.length === 0) {
    process.stderr.write('Usage: node scripts/verify-device-run.js <file-or-directory>... [--all] [--scenario <id>] [--json] | --list\n');
    return 1;
  }
  const reports = collectFiles(options.inputs).map((file) => verifyFile(file, { scenario: options.scenario }));
  if (options.json) {
    process.stdout.write(`${JSON.stringify(reports.map((r) => ({ file: r.file, entries: r.entries, malformed: r.malformed, results: r.results.map(({ scenario, status, lines }) => ({ id: scenario.id, status, lines })) })), null, 2)}\n`);
    return reports.some((r) => r.results.some((x) => x.status === 'fail')) ? 1 : 0;
  }
  const { text, counts } = formatReport(reports, options);
  process.stdout.write(`${text}\n`);
  return counts.fail > 0 ? 1 : 0;
}

if (require.main === module) process.exitCode = main(process.argv);

module.exports = { verifyFile, formatReport, collectFiles, parseArgs, listScenarios };
