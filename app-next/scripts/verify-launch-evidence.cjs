#!/usr/bin/env node
// Decides whether the standalone phone proof positively observed Trace Lab's
// real research screen after launch.
//
// The proof must never degrade an unobserved launch to a warning: a blank
// screen, a crash back to the Home Screen, an unexpected screen, the
// expo-dev-client prompt, or an OCR miss all fail. Only reading the expected
// research-screen marker counts as launch evidence. The caller keeps the
// screenshots and OCR transcript as diagnostics either way.
//
// Usage: verify-launch-evidence.cjs <device-ocr-text> [more-ocr-texts...]
//   Exits 0 and prints one PASS line when the screen marker was observed in
//   any OCR input. Exits 1 when no research-screen evidence was observed and
//   3 when the expo-dev-client prompt was observed instead (a terminal build
//   failure a caller may exit on immediately). Exits 2 with no arguments.
//   The caller keeps the screenshots and OCR transcript as diagnostics either
//   way.
/* global module, process, require */
const fs = require('node:fs');
const path = require('node:path');

// The same marker the artifact verifier requires inside the embedded bundle:
// seeing it on screen proves the installed binary not only carries but renders
// the guided research screen.
const REQUIRED_SCREEN_MARKER = 'How the test works';
// The expo-dev-client prompt is not the research screen, so it fails like any
// other unobserved screen; naming it only makes the diagnostic explicit.
const DEV_CLIENT_MARKERS = ['expo-development-client', 'development build', 'development server', 'metro'];

const EXPLANATION = {
  observed: `the guided research screen was on screen`,
  'dev-client': 'Trace Lab asked for a development server instead of rendering its research screen',
  unobserved: 'the guided research screen was not on screen (blank screen, crash, Home Screen, or another screen)',
};

/** Classify one OCR transcript as `observed`, `dev-client`, or `unobserved`. */
function classifyLaunchEvidence(ocrText) {
  const text = String(ocrText).toLowerCase();
  if (text.includes(REQUIRED_SCREEN_MARKER.toLowerCase())) return 'observed';
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
  const outcome = classifyLaunchEvidence(read.transcripts.join('\n'));
  if (outcome === 'observed') {
    console.log(`VERIFY PASS: OCR observed the research screen marker "${REQUIRED_SCREEN_MARKER}"`);
    return 0;
  }
  console.error(`VERIFY FAIL: ${EXPLANATION[outcome]}`);
  return outcome === 'dev-client' ? 3 : 1;
}

if (require.main === module) process.exit(main(process.argv));

module.exports = { REQUIRED_SCREEN_MARKER, DEV_CLIENT_MARKERS, classifyLaunchEvidence };
