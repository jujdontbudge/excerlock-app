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
// notice is the recorder's exact neutral refusal for a link that arrives while
// it already records, and it deliberately repeats generic phrases Trace Lab
// also renders.
const WALKING_RECORDER_SCREEN = [
  '9:41',
  'Walking Recorder',
  'Recording on this phone',
  'A recording is already running on this phone. Finish and save it, then start the linked test from Trace Lab.',
  'What are you doing now?',
  'Walking',
  'Sitting',
  'Standing',
  'Finish test',
].join('\n');

// The recorder's real notices, verbatim from CaptureController and the archive
// error descriptions. `value` stands for a Swift string interpolation, which is
// always a stream name, an error description, or an 8-character test id: the
// launch gate must reject every rendered notice, however generic its wording.
// The derivation test below re-reads these from the Swift copy owners, so a
// stale or invented entry fails instead of silently testing older copy.
const WALKING_RECORDER_NOTICES = [
  'Motion & Fitness was not allowed. No recording was started.',
  'That recording is not on this phone any more. Export it before deleting it next time.',
  'That link is not a valid linked test. Nothing was started.',
  'A recording is already running on this phone. Finish and save it, then start the linked test from Trace Lab.',
  'This linked test is already recorded on this phone. Use the linked-test card above to finish it in Trace Lab.',
  'This linked test is already recorded on this phone. Finish the newest unfinished test in Trace Lab first; nothing new was started.',
  'This linked test already has a saved recording on this phone. Nothing new was started.',
  'A previous attempt to record this test did not finish. Nothing was overwritten; start the test again in Trace Lab.',
  'Could not reopen the linked trace.',
  'ExcerLock Trace Lab is not installed. The protected recovery link remains on this phone.',
  'ExcerLock Trace Lab is not installed. This recording is still saved locally.',
  'Could not clear the protected recovery link: value',
  'Export failed: value',
  'Could not delete that session: value',
  'Allow Motion & Fitness, then tap the activity again.',
  'Allow Motion & Fitness and this linked test starts on its own.',
  'Motion & Fitness is off. Open Settings to allow it; no recording was started.',
  'Motion & Fitness is restricted on this phone, so recording cannot start.',
  'Required sensors are unavailable: value. No recording was started.',
  'Not enough free space for a safe recording. Delete a saved session first.',
  'Recorder storage is full. Export and delete a saved session before starting.',
  'Recording did not start: value',
  'A recording with this session already exists on this phone. Nothing was overwritten.',
  'The final boundary could not be written: value',
  'Session saved on this phone.',
  'The session stopped, but final saving needs attention: value',
  'value reported an error. The gap was saved.',
  'This recording reached its 250 MB safety limit. It was stopped and kept.',
  'The recording file is already closed.',
  'A sensor event could not be encoded.',
  'This archive still backs linked Trace Lab test value…. Finish that test in Trace Lab, then remove its protected reminder before deleting the archive.',
];

// The reminder card and its confirmed removal path, verbatim from
// RecorderLinkedReminderCopy. None of it may read as a Trace Lab phase either.
const WALKING_RECORDER_REMINDER_COPY = [
  'Linked test recorded here',
  'Test value… was recorded here. Trace Lab does not report back whether it saved or cancelled that test, so this protected one-time link stays on this phone until you remove it.',
  'Open Trace Lab to save it or check it. The one-time link stays in a protected file, stays out of every export, and survives a relaunch until you clear it.',
  'Open Trace Lab',
  'Remove this reminder',
  'Remove this reminder only after Trace Lab has saved or cancelled the test. Your recording stays on this phone.',
  'Remove reminder',
  'Keep it',
];

// Every string the recorder can render, as a full screen transcript.
const WALKING_RECORDER_COPY = [...WALKING_RECORDER_NOTICES, ...WALKING_RECORDER_REMINDER_COPY].map(
  (text) => ['9:41', 'Walking Recorder', 'Ready to record', text, 'Finish test'].join('\n'),
);

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

// Unrelated screens whose words merely contain a development-server word. The
// bare word "metro" is not, by itself, evidence of anything: matching it as a
// substring would diagnose a development server from an app named "Metronome"
// and end the proof instead of retrying a screen that may still be loading.
const UNRELATED_METRO_TEXT = [
  '9:41',
  'Metronome',
  'Practice tempo',
  'BPM 120',
  'Start metronome',
].join('\n');
const UNRELATED_METRO_STATION_TEXT = ['9:41', 'Maps', 'Metro station', 'King\u2019s Cross', 'Kilometro 12'].join('\n');

// The recorder copy lives in Swift, which no JavaScript test can import, so the
// fixtures above are duplicates of the declared strings. They are not taken on
// trust: these helpers read the copy owners and derive every double-quoted
// literal they declare, with `\(interpolation)` folded to one `value` word, so
// the tests below exercise the current copy and fail on a stale fixture.
// Deriving strings never claims Swift behavior; the assertions stay about this
// executable classifier's answer for text the recorder can actually render.
const RECORDER_COPY_SOURCES = ['RecorderModels.swift', 'CaptureController.swift', 'SessionArchive.swift'].map((name) =>
  path.join(__dirname, '..', '..', 'tools', 'phone-walking-recorder', 'Sources', name),
);

/** Every double-quoted Swift literal in `source`, interpolation values folded. */
function swiftStringLiterals(source) {
  const literals = [];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] !== '"') continue;
    let value = '';
    index += 1;
    while (index < source.length && source[index] !== '"') {
      if (source[index] === '\\') {
        const next = source[index + 1];
        if (next === '(') {
          // `\( ... )` interpolation: skip to its matching close paren.
          let depth = 0;
          index += 1;
          do {
            if (source[index] === '(') depth += 1;
            else if (source[index] === ')') depth -= 1;
            index += 1;
          } while (index < source.length && depth > 0);
          value += 'value';
          continue;
        }
        value += next === 'n' ? ' ' : next;
        index += 2;
        continue;
      }
      value += source[index];
      index += 1;
    }
    literals.push(value);
  }
  return literals;
}

/** Every distinct string literal the recorder's copy owners declare. */
function deriveRecorderCopy() {
  const copy = new Set();
  for (const file of RECORDER_COPY_SOURCES) {
    for (const literal of swiftStringLiterals(fs.readFileSync(file, 'utf8'))) copy.add(literal);
  }
  return [...copy];
}

/** One fresh recorder screen that shows only `text` as its notice. */
function recorderScreenFor(text) {
  return ['9:41', 'Walking Recorder', 'Ready to record', text, 'Finish test'].join('\n');
}

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

test('every real Walking Recorder notice and reminder string is unobserved launch evidence', () => {
  for (const transcript of WALKING_RECORDER_COPY) {
    assert.equal(detectResearchPhase(transcript), null, `recorder copy passed: ${transcript}`);
    assert.equal(classifyLaunchEvidence(transcript), 'unobserved', `recorder copy passed: ${transcript}`);
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

test('the recorder copy fixtures are the exact strings the Swift sources declare', () => {
  const declared = new Set(deriveRecorderCopy());
  for (const text of [...WALKING_RECORDER_NOTICES, ...WALKING_RECORDER_REMINDER_COPY]) {
    assert.ok(declared.has(text), `stale recorder fixture, not declared by the copy owners: ${JSON.stringify(text)}`);
  }
});

test('every string the recorder can render is rejected as Trace Lab evidence', () => {
  const copy = deriveRecorderCopy();
  // The owners declare far more than the hand-written fixtures; the derived set
  // is the recorder's whole screen vocabulary, not a second fixture list.
  assert.ok(copy.length >= 100, `expected the copy owners to declare many strings, got ${copy.length}`);
  for (const text of copy) {
    const screen = recorderScreenFor(text);
    assert.equal(detectResearchPhase(screen), null, `recorder copy passed: ${JSON.stringify(text)}`);
    assert.equal(classifyLaunchEvidence(screen), 'unobserved', `recorder copy passed: ${JSON.stringify(text)}`);
  }
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

test('every development-server marker is a distinctive multi-word phrase', () => {
  const { DEV_CLIENT_MARKERS } = require('./verify-launch-evidence.cjs');
  assert.ok(DEV_CLIENT_MARKERS.length > 0);
  assert.equal(new Set(DEV_CLIENT_MARKERS).size, DEV_CLIENT_MARKERS.length);
  for (const marker of DEV_CLIENT_MARKERS) {
    assert.ok(marker.trim().split(/[^a-z0-9]+/i).filter(Boolean).length >= 2, `marker is a lone word: ${marker}`);
  }
});

test('a word that merely contains "metro" is unresolved evidence, never a dev-server diagnosis', () => {
  for (const text of [UNRELATED_METRO_TEXT, UNRELATED_METRO_STATION_TEXT]) {
    assert.equal(detectResearchPhase(text), null);
    assert.equal(classifyLaunchEvidence(text), 'unobserved');
    withFile(text, (file) => {
      const result = runCli(file);
      assert.equal(result.status, 1, `expected retryable failure for ${JSON.stringify(text.slice(0, 24))}`);
      assert.equal(result.stdout, '');
      assert.match(result.stderr, /no Trace Lab research screen/);
      assert.doesNotMatch(result.stderr, /development server/);
    });
  }
});

test('markers match whole normalized words, not substrings of longer words', () => {
  const { containsPhrase } = require('./verify-launch-evidence.cjs');
  assert.equal(containsPhrase('a metronome keeps time', 'metro bundler'), false);
  assert.equal(containsPhrase('metro bundler ready', 'metro bundler'), true);
  assert.equal(containsPhrase('fetch development servers', 'development server'), false);
  assert.equal(containsPhrase('fetch development servers', 'fetch development servers'), true);
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
    [WALKING_RECORDER_COPY[0], /no Trace Lab research screen/],
    [UNRELATED_METRO_TEXT, /no Trace Lab research screen/],
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
