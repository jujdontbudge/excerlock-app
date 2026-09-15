// The standalone phone proof must positively observe Trace Lab's research
// screen after launch. Installing the standalone build over the existing Trace
// Lab can legitimately land on any persisted phase, so these fixtures are the
// launch outcomes the executable gate has to classify: ready, running
// (active/recovered), review (finished awaiting save), expired, and exported
// all pass; a blank screen, a crash back to the Home Screen, Walking
// Recorder's own screen, the expo-dev-client prompt, an empty OCR pass, and a
// missing OCR file all fail instead of warning.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { RESEARCH_SCREEN_PHASES, detectResearchPhase, classifyLaunchEvidence } = require('./verify-launch-evidence.cjs');

const SCRIPT = path.join(__dirname, 'verify-launch-evidence.cjs');

// Real copy from LinkedTraceScreen.research.tsx as macOS Vision OCR reads it
// from a device screenshot. One fixture per phase the persisted screen can
// legitimately render after an install-over-existing-data.
const PHASE_SCREENS = [
  {
    phase: 'ready',
    text: [
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
    ].join('\n'),
  },
  {
    phase: 'running',
    text: [
      '9:41',
      'ExcerLock Trace Lab',
      'Test running',
      'Research build · everything stays on this phone · two-hour limit',
      'Trace Lab is recording in the background',
      'Recording on this phone',
      'Trace Lab is in the background, exactly like ExcerLock during a normal walk.',
      'Open Walking Recorder',
    ].join('\n'),
  },
  {
    phase: 'review',
    text: [
      '9:41',
      'ExcerLock Trace Lab',
      'Test finished — save it',
      'Research build · everything stays on this phone · two-hour limit',
      'Walking Recorder finished the ground truth',
      'Save the trace',
      'Save trace file',
    ].join('\n'),
  },
  {
    phase: 'expired',
    text: [
      '9:41',
      'ExcerLock Trace Lab',
      'This test expired',
      'Research build · everything stays on this phone · two-hour limit',
      'No longer exportable',
      'Two-hour limit reached',
      'Delete expired test',
    ].join('\n'),
  },
  {
    phase: 'exported',
    text: [
      '9:41',
      'ExcerLock Trace Lab',
      'Linked walking test',
      'Research build · everything stays on this phone · two-hour limit',
      'Saved on this phone',
      '1 saved test on this phone',
      'How the test works',
      'Start test',
      'Saved tests on this phone',
      'Latest test 3f9c21ab…',
      'Share trace file',
      'Share Walking Recorder archive',
    ].join('\n'),
  },
];

// A crash back to the Home Screen: the launcher labels carry the app names but
// none of the research screen.
const HOME_SCREEN = ['9:41', 'ExcerLock Trace Lab', 'Walking Recorder', 'Camera', 'Photos', 'Maps', 'Settings'].join('\n');

// Walking Recorder's own screen while it records: it is the app the operator
// switches to, so its text must never count as Trace Lab launch evidence. The
// notice deliberately repeats generic phrases Trace Lab also renders.
const WALKING_RECORDER_SCREEN = [
  '9:41',
  'Walking Recorder',
  'Recording on this phone',
  'Notice: Test running late — the recorder keeps this session on this phone.',
  'What are you doing now?',
  'Walking',
  'Sitting',
  'Standing',
  'Finish test',
].join('\n');

// The recorder's real notices, verbatim from CaptureController. A notice must
// never look like a Trace Lab phase, however generic its wording.
const WALKING_RECORDER_NOTICES = [
  'Motion & Fitness was not allowed. No recording was started.',
  'That recording is not on this phone any more. Export it before deleting it next time.',
  'That link is not a valid linked test. Nothing was started.',
  'Another linked test is already recording. Finish it before starting a new one.',
  'Could not reopen the linked trace.',
  'ExcerLock Trace Lab is not installed. The protected recovery link remains on this phone.',
  'Finalize or explicitly abandon the linked Trace Lab session before deleting this Recorder archive.',
].map((notice) => ['9:41', 'Walking Recorder', 'Ready to record', notice, 'Finish test'].join('\n'));

// Walking Recorder's saved-sessions screen deliberately reuses the phrase
// "Saved on this phone", so marker matching must not treat that phrase alone
// as Trace Lab's exported phase.
const WALKING_RECORDER_SAVED_SCREEN = [
  '9:41',
  'Walking Recorder',
  'Saved on this phone',
  'Your finished sessions will appear here, ready to share.',
  'Finish & Save',
].join('\n');

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

test('every legitimate persisted research phase is observed launch evidence', () => {
  for (const { phase, text } of PHASE_SCREENS) {
    const detected = detectResearchPhase(text);
    assert.equal(detected?.phase, phase, `classifier rejected the ${phase} phase`);
    assert.equal(classifyLaunchEvidence(text), 'observed', `classifier rejected the ${phase} phase`);
    withFile(text, (file) => {
      const result = runCli(file);
      assert.equal(result.status, 0, `${phase}: ${result.stderr}`);
      assert.match(result.stdout, /VERIFY PASS/);
      assert.match(result.stdout, new RegExp(`phase "${phase}"`));
    });
  }
});

test('the phase markers are unique and cover every persisted phase', () => {
  const markers = RESEARCH_SCREEN_PHASES.flatMap((entry) => entry.markers);
  assert.equal(new Set(markers).size, markers.length);
  for (const phase of ['running', 'review', 'expired', 'exported', 'ready']) {
    assert.ok(RESEARCH_SCREEN_PHASES.some((entry) => entry.phase === phase), `no marker for ${phase}`);
  }
});

test('a single generic line is never launch evidence', () => {
  // Each of these appears on the research screen in some phase, but not alone:
  // the classifier requires the phase's whole Trace-Lab-specific combination.
  for (const lone of ['Recording on this phone', 'Start test', 'Saved on this phone', 'Test running', 'Save the trace']) {
    assert.equal(detectResearchPhase(lone), null, `a lone "${lone}" passed`);
    assert.equal(classifyLaunchEvidence(lone), 'unobserved', `a lone "${lone}" passed`);
  }
});

test('every real Walking Recorder notice is unobserved launch evidence', () => {
  for (const transcript of WALKING_RECORDER_NOTICES) {
    assert.equal(detectResearchPhase(transcript), null, `notice passed: ${transcript}`);
    assert.equal(classifyLaunchEvidence(transcript), 'unobserved', `notice passed: ${transcript}`);
  }
});

test('the observation is case-insensitive and survives OCR noise around it', () => {
  const { text } = PHASE_SCREENS[0];
  assert.equal(classifyLaunchEvidence(text.toUpperCase()), 'observed');
  assert.equal(classifyLaunchEvidence(`===== launch-1.png\n${text}\n`), 'observed');
  // OCR often renders the heading's middle dot and smart dashes differently.
  const noisy = text.replace(/·/g, '*').replace(/—/g, '-');
  assert.equal(classifyLaunchEvidence(noisy), 'observed');
});

test('blank, crashed-to-Home, Walking Recorder, and empty OCR reads are unobserved', () => {
  assert.equal(classifyLaunchEvidence(STATUS_BAR_ONLY), 'unobserved');
  assert.equal(classifyLaunchEvidence(HOME_SCREEN), 'unobserved');
  assert.equal(classifyLaunchEvidence(WALKING_RECORDER_SCREEN), 'unobserved');
  assert.equal(classifyLaunchEvidence(WALKING_RECORDER_SAVED_SCREEN), 'unobserved');
  assert.equal(classifyLaunchEvidence(EMPTY), 'unobserved');
  assert.equal(detectResearchPhase(WALKING_RECORDER_SAVED_SCREEN), null);
  assert.equal(detectResearchPhase(WALKING_RECORDER_SCREEN), null);
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
  withFile(PHASE_SCREENS[0].text, (file) => {
    const result = runCli(file);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /VERIFY PASS/);
    assert.match(result.stdout, /phase "ready"/);
    assert.match(result.stdout, /How the test works/);
  });
});

test('the command line fails for a Walking Recorder notice that copies a marker phrase', () => {
  withFile(WALKING_RECORDER_SCREEN, (file) => {
    const result = runCli(file);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /no Trace Lab research screen/);
  });
});

test('every unobserved launch outcome exits 1 and keeps its reason on stderr', () => {
  const cases = [
    [STATUS_BAR_ONLY, /no Trace Lab research screen/],
    [HOME_SCREEN, /no Trace Lab research screen/],
    [WALKING_RECORDER_SCREEN, /no Trace Lab research screen/],
    [WALKING_RECORDER_SAVED_SCREEN, /no Trace Lab research screen/],
    [WALKING_RECORDER_NOTICES[0], /no Trace Lab research screen/],
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
