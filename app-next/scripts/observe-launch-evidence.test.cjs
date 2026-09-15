// Hermetic coverage for the production observation loop in
// observe-launch-evidence.sh. A stubbed screenshot command and OCR binary drive
// the real sourced function on any machine; verify-launch-evidence.cjs stays
// the real evidence gate. The cases are the outcomes the phone proof must
// handle: a positive read for every legitimate persisted research phase,
// retried unknown screens, a late success, repeated OCR failure, repeated
// screenshot failure, Walking Recorder text that must never pass, and the
// terminal dev-client prompt.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const HELPER = path.join(__dirname, 'observe-launch-evidence.sh');
const SCRIPTS = __dirname;

// The screenshot stub receives `developer dvt screenshot <path>` and either
// writes a file at that path or fails like a disconnected device.
function screenshotStub(mode) {
  return `#!/bin/bash
set -euo pipefail
if [[ "${mode}" != "ok" ]]; then
  echo "stub: no device attached" >&2
  exit 1
fi
printf 'png' > "$4"
`;
}

// The OCR stub receives `<device-ocr.py> <screenshot>`. `late-screen` counts
// attempts beside the screenshots so the test can prove the loop exits on the
// first positive read rather than after the full bound. Each research phase
// emits the full Trace-Lab-only marker combination the real screen renders.
function ocrStub(mode) {
  return `#!/bin/bash
set -euo pipefail
case "${mode}" in
  screen) echo "ExcerLock Trace Lab"; echo "How the test works"; echo "Trace Lab begins the background trace";;
  running) echo "Trace Lab is recording in the background"; echo "Recording on this phone";;
  review) echo "Walking Recorder finished the ground truth"; echo "Save trace file";;
  expired) echo "Two-hour limit reached"; echo "No longer exportable";;
  exported) echo "Saved tests on this phone"; echo "Share trace file";;
  recorder) echo "Walking Recorder"; echo "Recording on this phone"; echo "Notice: Test running late — the recorder keeps this session on this phone."; echo "Finish test";;
  notice) echo "Walking Recorder"; echo "Motion & Fitness was not allowed. No recording was started.";;
  late-screen)
    dir="$(dirname "$2")"
    count_file="$dir/ocr-count"
    n=0
    [[ -f "$count_file" ]] && n="$(cat "$count_file")"
    n=$((n + 1))
    echo "$n" > "$count_file"
    if [[ "$n" -ge 2 ]]; then echo "How the test works"; echo "Trace Lab begins the background trace"; else echo "9:41"; fi
    ;;
  dev-client) echo "Development servers"; echo "http://10.0.1.20:8081";;
  metro-word) echo "Metronome"; echo "Practice tempo"; echo "BPM 120";;
  fail) echo "stub: Vision unavailable" >&2; exit 1;;
  blank) echo "9:41";;
esac
`;
}

function runScenario({ screenshot = 'ok', ocr = 'screen', attempts = 3 }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'observe-launch-evidence-'));
  try {
    const out = path.join(root, 'out');
    fs.mkdirSync(out);
    const bin = path.join(root, 'bin');
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin, 'pymobiledevice3'), screenshotStub(screenshot), { mode: 0o755 });
    fs.chmodSync(path.join(bin, 'pymobiledevice3'), 0o755);
    const ocrPath = path.join(root, 'ocr-stub.sh');
    fs.writeFileSync(ocrPath, ocrStub(ocr), { mode: 0o755 });
    fs.chmodSync(ocrPath, 0o755);
    const driver = path.join(root, 'driver.sh');
    fs.writeFileSync(
      driver,
      `#!/bin/bash\nset -euo pipefail\nsource "${HELPER}"\nexport PATH="${bin}:$PATH"\nobserve_launch_evidence "${out}" "${SCRIPTS}" "${ocrPath}"\n`,
      { mode: 0o755 },
    );
    try {
      const stdout = execFileSync('bash', [driver], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, OBSERVE_ATTEMPTS: String(attempts), OBSERVE_INTERVAL: '0' },
      });
      return { status: 0, stdout, stderr: '', files: filesOf(out) };
    } catch (error) {
      return { status: error.status, stdout: error.stdout ?? '', stderr: error.stderr ?? '', files: filesOf(out) };
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function filesOf(out) {
  const files = {};
  for (const name of fs.readdirSync(out).sort()) {
    const full = path.join(out, name);
    if (fs.statSync(full).isFile()) files[name] = fs.readFileSync(full, 'utf8');
  }
  return files;
}

test('the first positive observation passes immediately with its evidence', () => {
  const result = runScenario({ ocr: 'screen' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /VERIFY PASS: OCR observed the Trace Lab research screen \(phase "ready"\)/);
  assert.match(result.stdout, /on attempt 1 of 3/);
  assert.match(result.files['launch-evidence-1.log'], /VERIFY PASS/);
  assert.equal(result.files['launch-2.png'], undefined);
  assert.equal(result.files['launch-evidence-2.log'], undefined);
});

test('every legitimate persisted research phase passes the production loop', () => {
  const phases = [['screen', 'ready'], ['running', 'running'], ['review', 'review'], ['expired', 'expired'], ['exported', 'exported']];
  for (const [mode, phase] of phases) {
    const result = runScenario({ ocr: mode, attempts: 3 });
    assert.equal(result.status, 0, `${phase}: ${result.stderr}`);
    assert.match(result.stdout, new RegExp(`phase "${phase}"`), phase);
    assert.match(result.stdout, /on attempt 1 of 3/, phase);
  }
});

test('Walking Recorder text never counts as Trace Lab launch evidence', () => {
  const result = runScenario({ ocr: 'recorder', attempts: 2 });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no positive research-screen evidence in 2 bounded attempts/);
  assert.match(result.files['launch-evidence-1.log'], /VERIFY FAIL: no Trace Lab research screen/);
});

test('a real Walking Recorder notice never counts as Trace Lab launch evidence', () => {
  const result = runScenario({ ocr: 'notice', attempts: 1 });
  assert.equal(result.status, 1);
  assert.match(result.files['launch-evidence-1.log'], /VERIFY FAIL: no Trace Lab research screen/);
});

test('a late positive observation exits early instead of finishing the bound', () => {
  const result = runScenario({ ocr: 'late-screen' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /on attempt 2 of 3/);
  assert.ok(result.files['launch-2.png'] !== undefined);
  assert.equal(result.files['launch-3.png'], undefined);
});

test('repeated unknown screens exhaust the bound with per-attempt diagnostics', () => {
  const result = runScenario({ ocr: 'blank' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no positive research-screen evidence in 3 bounded attempts \(screenshots failed: 0, OCR failed: 0\)/);
  assert.match(result.stderr, /last observation: VERIFY FAIL: no Trace Lab research screen was on screen/);
  for (const attempt of [1, 2, 3]) {
    assert.ok(result.files[`launch-${attempt}.png`] !== undefined);
    assert.ok(result.files[`launch-ocr-${attempt}.txt`] !== undefined);
    assert.ok(result.files[`launch-evidence-${attempt}.log`] !== undefined);
  }
});

test('repeated OCR command failure is counted and keeps each stderr transcript', () => {
  const result = runScenario({ ocr: 'fail' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /\(screenshots failed: 0, OCR failed: 3\)/);
  assert.match(result.files['launch-ocr-1.err'], /Vision unavailable/);
  assert.match(result.files['launch-ocr-3.err'], /Vision unavailable/);
});

test('a failing screenshot command is counted instead of silently skipped', () => {
  const result = runScenario({ screenshot: 'fail' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /\(screenshots failed: 3, OCR failed: 0\)/);
  assert.match(result.files['launch-screenshot-1.log'], /no device attached/);
  assert.match(result.files['launch-screenshot-3.log'], /no device attached/);
});

test('the terminal dev-client prompt fails on the first attempt without retrying', () => {
  const result = runScenario({ ocr: 'dev-client' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /asked for a development server/);
  assert.match(result.files['launch-evidence-1.log'], /VERIFY FAIL/);
  assert.equal(result.files['launch-2.png'], undefined);
  assert.equal(result.files['launch-evidence-2.log'], undefined);
});

test('a screen that merely contains "metro" retries instead of a false dev-server diagnosis', () => {
  const result = runScenario({ ocr: 'metro-word' });
  assert.equal(result.status, 1);
  // All three attempts ran: the word "metro" inside "Metronome" is unresolved
  // evidence, so the loop retries rather than ending the proof early.
  assert.match(result.stderr, /no positive research-screen evidence in 3 bounded attempts/);
  assert.doesNotMatch(result.stderr, /asked for a development server/);
  for (const attempt of [1, 2, 3]) {
    assert.match(result.files[`launch-evidence-${attempt}.log`], /VERIFY FAIL: no Trace Lab research screen/);
  }
});
