// The standalone phone proof must positively observe Trace Lab's research
// screen after launch. These fixtures are the launch outcomes the executable
// gate has to classify: the rendered screen passes; a blank screen, a crash
// back to the Home Screen, an unrelated app screen, the expo-dev-client prompt,
// an empty OCR pass, and a missing OCR file all fail instead of warning.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { classifyLaunchEvidence } = require('./verify-launch-evidence.cjs');

const SCRIPT = path.join(__dirname, 'verify-launch-evidence.cjs');

// Real copy from LinkedTraceScreen.research.tsx as macOS Vision OCR reads it
// from a device screenshot.
const RESEARCH_SCREEN = [
  '9:41',
  'ExcerLock Trace Lab',
  'Linked walking test',
  'Research build · everything stays on this phone · two-hour limit',
  'Not recording yet',
  'No GPS, microphone, camera, raw vectors, or Health history is collected.',
  'How the test works',
  '1 Tap Start test. Trace Lab begins the background trace and opens Walking Recorder.',
  'Ready to start',
  'Start test',
].join('\n');

// A crash back to the Home Screen: the launcher label carries the app name but
// none of the research screen.
const HOME_SCREEN = ['9:41', 'ExcerLock Trace Lab', 'Walking Recorder', 'Camera', 'Photos', 'Maps', 'Settings'].join('\n');

// A different app is in front when the screenshot lands.
const WRONG_APP_SCREEN = ['9:41', 'Walking Recorder', 'Recording', 'Walking', 'Finish test'].join('\n');

// The dev-client prompt means the binary booted but asked the Mac for a bundle.
const DEV_CLIENT_PROMPT = [
  '9:41',
  'Development servers',
  'Fetch development servers',
  'Enter URL manually',
  'http://10.0.1.20:8081',
].join('\n');

const STATUS_BAR_ONLY = '9:41\n';
const EMPTY = '';

function withFile(text, body) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-launch-evidence-'));
  const file = path.join(root, 'launch-ocr.txt');
  if (text !== null) fs.writeFileSync(file, text);
  try {
    return body(file);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function runCli(...files) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, ...files], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { status: 0, stdout, stderr: '' };
  } catch (error) {
    return { status: error.status, stdout: error.stdout ?? '', stderr: error.stderr ?? '' };
  }
}

test('the research screen is the only observed launch evidence', () => {
  assert.equal(classifyLaunchEvidence(RESEARCH_SCREEN), 'observed');
  assert.equal(classifyLaunchEvidence(RESEARCH_SCREEN.toUpperCase()), 'observed');
  assert.equal(classifyLaunchEvidence(`===== launch-1.png\n${RESEARCH_SCREEN}\n`), 'observed');
});

test('blank, crashed-to-Home, wrong-app, and empty OCR reads are unobserved', () => {
  assert.equal(classifyLaunchEvidence(STATUS_BAR_ONLY), 'unobserved');
  assert.equal(classifyLaunchEvidence(HOME_SCREEN), 'unobserved');
  assert.equal(classifyLaunchEvidence(WRONG_APP_SCREEN), 'unobserved');
  assert.equal(classifyLaunchEvidence(EMPTY), 'unobserved');
});

test('the dev-client prompt is a terminal failure with its own diagnostic', () => {
  assert.equal(classifyLaunchEvidence(DEV_CLIENT_PROMPT), 'dev-client');
  withFile(DEV_CLIENT_PROMPT, (file) => {
    const result = runCli(file);
    assert.equal(result.status, 3);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /VERIFY FAIL/);
    assert.match(result.stderr, /development server/);
  });
});

test('the command line passes only on positive research-screen evidence', () => {
  withFile(RESEARCH_SCREEN, (file) => {
    const result = runCli(file);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /VERIFY PASS/);
    assert.match(result.stdout, /How the test works/);
  });
});

test('every unobserved launch outcome exits 1 and keeps its reason on stderr', () => {
  const cases = [
    [STATUS_BAR_ONLY, /not on screen/],
    [HOME_SCREEN, /not on screen/],
    [WRONG_APP_SCREEN, /not on screen/],
    [EMPTY, /is empty/],
  ];
  for (const [text, expected] of cases) {
    withFile(text, (file) => {
      const result = runCli(file);
      assert.equal(result.status, 1, `expected failure for ${JSON.stringify(text.slice(0, 32))}`);
      assert.equal(result.stdout, '');
      assert.match(result.stderr, /VERIFY FAIL/);
      assert.match(result.stderr, expected);
    });
  }
});

test('a missing or unreadable OCR file is a failure, not a skipped check', () => {
  withFile(null, (missing) => {
    const result = runCli(missing);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /no OCR output/);
  });
});

test('misuse exits 2 so the proof can distinguish a broken gate invocation', () => {
  const result = runCli();
  assert.equal(result.status, 2);
  assert.match(result.stderr, /usage/);
});
