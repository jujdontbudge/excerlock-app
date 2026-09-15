#!/usr/bin/env node
// Decides whether the standalone phone proof positively observed a real Trace
// Lab research screen after launch.
//
// The proof must never degrade an unobserved launch to a warning: a blank
// screen, a crash back to the Home Screen, an unexpected screen, the
// expo-dev-client prompt, or an OCR miss all fail. Installing the standalone
// build over the existing Trace Lab can legitimately land on any persisted
// phase of the guided research screen, so every one of them counts as launch
// evidence: ready, running (active or recovered after a relaunch),
// finished-awaiting-save (review), expired, and the saved/exported list.
//
// Each phase is recognized by copy that only the Trace Lab research screen
// renders, so a Home Screen (which shows "ExcerLock Trace Lab" and "Walking
// Recorder" as launcher labels), the Walking Recorder screen (which uses
// "Saved on this phone" in its own saved-sessions header), a blank screen, a
// crash, or any other UI cannot pass by accident.
//
// Usage: verify-launch-evidence.cjs <device-ocr-text> [more-ocr-texts...]
//   Exits 0 and prints one PASS line when a research-screen phase was observed
//   in any OCR input. Exits 1 when no research-screen evidence was observed
//   and 3 when the expo-dev-client prompt was observed instead (a terminal
//   build failure a caller may exit on immediately). Exits 2 with no
//   arguments. The caller keeps the screenshots and OCR transcript as
//   diagnostics either way.
/* global module, process, require */
const fs = require('node:fs');
const path = require('node:path');

// Ordered so a screen that shows both the saved list and the guided start
// section reports its most specific phase. Every marker is literal copy from
// LinkedTraceScreen.research.tsx: the section label or status-card title that
// each phase renders at the top of the screen, so a single unscrolled
// screenshot is enough. The saved-list header sits below the guided start
// section, but that same start section renders in the exported phase too, so
// the ready marker covers an exported screen captured without scrolling.
const RESEARCH_SCREEN_PHASES = Object.freeze([
  // Active trace, including one recovered by relaunching Trace Lab mid-test.
  { phase: 'running', marker: 'Recording on this phone' },
  { phase: 'running', marker: 'Trace Lab is recording in the background' },
  // Walking Recorder's return link arrived; the finished trace awaits saving.
  { phase: 'review', marker: 'Save the trace' },
  { phase: 'review', marker: 'Walking Recorder finished the ground truth' },
  // The two-hour limit already passed; the trace can only be deleted.
  { phase: 'expired', marker: 'Two-hour limit reached' },
  { phase: 'expired', marker: 'No longer exportable' },
  // Finalized traces exist on this phone (the section header; the status-card
  // wording "Saved on this phone" is deliberately not a marker because
  // Walking Recorder shows that same phrase on its own screen).
  { phase: 'exported', marker: 'Saved tests on this phone' },
  // Nothing recorded yet; the guided start section. This same section also
  // renders above the saved list, so it covers the exported phase too.
  { phase: 'ready', marker: 'How the test works' },
  { phase: 'ready', marker: 'Not recording yet' },
]);
// The expo-dev-client prompt is not the research screen, so it fails like any
// other unobserved screen; naming it only makes the diagnostic explicit.
const DEV_CLIENT_MARKERS = ['expo-development-client', 'development build', 'development server', 'metro'];

const EXPLANATION = {
  'dev-client': 'Trace Lab asked for a development server instead of rendering its research screen',
  unobserved: 'no Trace Lab research screen was on screen (blank screen, crash, Home Screen, another app, or an unrecognized screen)',
};

/** Return `{ phase, marker }` for the first research-screen phase in the OCR text, or null. */
function detectResearchPhase(ocrText) {
  const text = String(ocrText).toLowerCase();
  for (const entry of RESEARCH_SCREEN_PHASES) {
    if (text.includes(entry.marker.toLowerCase())) return { ...entry };
  }
  return null;
}

/** Classify one OCR transcript as `observed`, `dev-client`, or `unobserved`. */
function classifyLaunchEvidence(ocrText) {
  if (detectResearchPhase(ocrText)) return 'observed';
  const text = String(ocrText).toLowerCase();
  if (DEV_CLIENT_MARKERS.some((marker) => text.includes(marker.toLowerCase()))) return 'dev-client';
  return 'unobserved';
}

function readTranscripts(files) {
  const transcripts = [];
  for (const file of files) {
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      return { error: `no OCR output at ${path.resolve(file)}; the launch was not observed` };
    }
    const text = fs.readFileSync(file, 'utf8');
    if (!text.trim()) {
      return { error: `OCR output at ${path.resolve(file)} is empty; the launch was not observed` };
    }
    transcripts.push(text);
  }
  return { transcripts };
}

function main(argv) {
  const files = argv.slice(2);
  if (!files.length) {
    console.error('usage: verify-launch-evidence.cjs <device-ocr-text> [more-ocr-texts...]');
    return 2;
  }
  const read = readTranscripts(files);
  if (read.error) {
    console.error(`VERIFY FAIL: ${read.error}`);
    return 1;
  }
  const joined = read.transcripts.join('\n');
  const detected = detectResearchPhase(joined);
  if (detected) {
    console.log(`VERIFY PASS: OCR observed the Trace Lab research screen (phase "${detected.phase}") via marker "${detected.marker}"`);
    return 0;
  }
  const outcome = classifyLaunchEvidence(joined);
  console.error(`VERIFY FAIL: ${EXPLANATION[outcome]}`);
  return outcome === 'dev-client' ? 3 : 1;
}

if (require.main === module) process.exit(main(process.argv));

module.exports = { RESEARCH_SCREEN_PHASES, DEV_CLIENT_MARKERS, detectResearchPhase, classifyLaunchEvidence };
