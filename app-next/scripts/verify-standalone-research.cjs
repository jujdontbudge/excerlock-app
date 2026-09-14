#!/usr/bin/env node
// Signed-artifact verification for the standalone Linked Recorder research build.
// This is the executable counterpart of the requirement that the Trace Lab
// binary boots from its embedded JS bundle with no Metro, no expo-dev-client,
// no OTA, and no production identity. It reads the artifact, never config
// source, so it fails exactly when the shipped binary would.
//
// Usage:
//   verify-standalone-research.cjs <ExcerLock.app> [options]
//
// Options:
//   --bundle <file>            JS bundle to inspect (default <app>/main.jsbundle)
//   --entitlements <file>      Entitlements plist/JSON instead of codesign (tests)
//   --skip-codesign            Do not invoke codesign (fixture tests)
//   --min-bundle-bytes <n>     Minimum embedded bundle size (default 1000000)
/* global process */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const APP_BUNDLE_ID = 'com.johansardar.excerlock.lab.linkedtrace';
const APP_DISPLAY_NAME = 'ExcerLock Trace Lab';
const APP_GROUP = 'group.com.johansardar.excerlock.lab.linkedtrace';
const TEAM = 'AX3C2B78YD';
const SCHEME = 'excerlock-linked-trace';
const OTA_PROJECT_URL = 'u.expo.dev/9a358379';
const MAX_SCAN_BYTES = 200 * 1024 * 1024;
// The research screen strings prove the research JS selection reached the
// embedded bundle; they are literals in LinkedTraceScreen.research.tsx.
const REQUIRED_BUNDLE_MARKERS = ['Recorder link required', 'Start linked trace'];
// Hermes bytecode concatenates string-table entries, so short markers like
// `EXDevLauncher` can appear as accidental substrings. The bundle scan uses
// full module/symbol names; the native scan below stays strict because those
// symbols only exist when the dev-client pods are actually linked.
const FORBIDDEN_BUNDLE_MARKERS = ['EXDevLauncherController', 'expo-dev-launcher', 'expo-dev-menu'];
// Native dev-client symbols and its LAN/deep-link surface must be absent.
const FORBIDDEN_MARKERS = [
  'EXDevLauncher',
  'EXDevMenu',
  'expo-dev-client',
  'expo-dev-launcher',
  'expo-dev-menu',
  'exp+excerlock',
  'expo-development-client',
  '_expo._tcp',
  OTA_PROJECT_URL,
];

function plistToJson(file) {
  const output = execFileSync('plutil', ['-convert', 'json', '-o', '-', file], { encoding: 'utf8' });
  return JSON.parse(output);
}

function readEntitlements(options) {
  if (options.entitlements) {
    const raw = fs.readFileSync(options.entitlements, 'utf8');
    try {
      return JSON.parse(raw);
    } catch {
      return plistToJson(options.entitlements);
    }
  }
  const dumped = execFileSync('codesign', ['-d', '--entitlements', ':-', options.app], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const temp = path.join(os.tmpdir(), `standalone-research-entitlements-${process.pid}.plist`);
  try {
    fs.writeFileSync(temp, dumped);
    return plistToJson(temp);
  } finally {
    fs.rmSync(temp, { force: true });
  }
}

function urlSchemes(info) {
  const types = Array.isArray(info.CFBundleURLTypes) ? info.CFBundleURLTypes : [];
  return types.flatMap((type) => (Array.isArray(type.CFBundleURLSchemes) ? type.CFBundleURLSchemes : []));
}

function verifyBundle(bundlePath, minBytes, failures, passed) {
  if (!fs.existsSync(bundlePath)) {
    failures.push(`missing embedded JS bundle: ${bundlePath}`);
    return;
  }
  const size = fs.statSync(bundlePath).size;
  if (size < minBytes) failures.push(`embedded JS bundle is too small: ${size} bytes (want >= ${minBytes})`);
  const text = fs.readFileSync(bundlePath).toString('latin1');
  const missing = REQUIRED_BUNDLE_MARKERS.filter((marker) => !text.includes(marker));
  for (const marker of missing) failures.push(`embedded JS bundle is missing research screen marker: ${marker}`);
  const smuggled = FORBIDDEN_BUNDLE_MARKERS.filter((marker) => text.includes(marker));
  for (const marker of smuggled) failures.push(`embedded JS bundle contains dev-client module marker: ${marker}`);
  if (!missing.length && !smuggled.length && size >= minBytes) {
    passed.push(`embedded JS bundle present (${size} bytes) with research screen markers and no dev-client modules`);
  }
}

function verifyInfoPlist(app, failures, passed) {
  const infoPlist = path.join(app, 'Info.plist');
  if (!fs.existsSync(infoPlist)) {
    failures.push(`missing Info.plist: ${infoPlist}`);
    return;
  }
  const before = failures.length;
  const info = plistToJson(infoPlist);
  if (info.CFBundleIdentifier !== APP_BUNDLE_ID) failures.push(`CFBundleIdentifier is ${String(info.CFBundleIdentifier)} (want ${APP_BUNDLE_ID})`);
  if (info.CFBundleDisplayName !== APP_DISPLAY_NAME) failures.push(`CFBundleDisplayName is ${String(info.CFBundleDisplayName)} (want ${APP_DISPLAY_NAME})`);
  const schemes = urlSchemes(info);
  if (!schemes.includes(SCHEME)) failures.push(`Info.plist URL schemes ${JSON.stringify(schemes)} miss ${SCHEME}`);
  const devSchemes = schemes.filter((scheme) => scheme.startsWith('exp+') || scheme === 'expo-development-client');
  if (devSchemes.length) failures.push(`Info.plist carries dev-client URL scheme(s): ${devSchemes.join(', ')}`);
  const bonjour = Array.isArray(info.NSBonjourServices) ? info.NSBonjourServices : [];
  if (bonjour.some((service) => String(service).replace(/\.$/, '') === '_expo._tcp')) {
    failures.push('Info.plist advertises the _expo._tcp dev-server Bonjour service');
  }
  for (const key of ['NSLocalNetworkUsageDescription', 'DEV_CLIENT_DEFAULT_LAUNCHER_URL', 'DEV_CLIENT_TRY_TO_LAUNCH_LAST_BUNDLE']) {
    if (info[key] !== undefined) failures.push(`Info.plist carries dev-client key ${key}`);
  }
  if (failures.length === before) {
    passed.push(`Info.plist identity ${info.CFBundleIdentifier} with scheme ${SCHEME} and no dev-client surface`);
  }
}

function verifyExpoPlist(app, failures, passed) {
  const expoPlist = path.join(app, 'Expo.plist');
  if (!fs.existsSync(expoPlist)) {
    failures.push('missing Expo.plist (OTA state is unknown)');
    return;
  }
  const before = failures.length;
  const expo = plistToJson(expoPlist);
  if (expo.EXUpdatesEnabled !== false) failures.push(`Expo.plist EXUpdatesEnabled is ${String(expo.EXUpdatesEnabled)} (want false)`);
  if (expo.EXUpdatesURL !== undefined) failures.push('Expo.plist carries an OTA update URL');
  if (failures.length === before) passed.push('Expo.plist disables OTA updates and carries no update URL');
}

function verifyEntitlements(options, failures, passed) {
  const before = failures.length;
  const entitlements = readEntitlements(options);
  const applicationId = entitlements['application-identifier'];
  if (applicationId !== `${TEAM}.${APP_BUNDLE_ID}`) failures.push(`application-identifier is ${String(applicationId)} (want ${TEAM}.${APP_BUNDLE_ID})`);
  const groups = entitlements['com.apple.security.application-groups'];
  if (JSON.stringify(groups) !== JSON.stringify([APP_GROUP])) failures.push(`App Groups are ${JSON.stringify(groups)} (want exactly ${APP_GROUP})`);
  if (failures.length === before) passed.push('signature carries the isolated lab identity and App Group only');
}

function scanMarkers(root, failures, passed) {
  const before = failures.length;
  const bundleName = 'main.jsbundle';
  const walk = (target) => {
    const stat = fs.lstatSync(target);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(target)) walk(path.join(target, name));
      return;
    }
    if (!stat.isFile() || stat.size > MAX_SCAN_BYTES) return;
    // main.jsbundle is Hermes bytecode; short markers collide with concatenated
    // string-table entries. verifyBundle owns that file with module-level names.
    if (path.basename(target) === bundleName) return;
    const data = fs.readFileSync(target);
    for (const marker of FORBIDDEN_MARKERS) {
      if (data.includes(Buffer.from(marker))) failures.push(`${target}: contains ${marker}`);
    }
  };
  walk(root);
  if (failures.length === before) {
    passed.push('native artifact contains no dev-client, LAN, OTA or research-isolation violation marker');
  }
}

function main() {
  const args = process.argv.slice(2);
  const options = { app: null, bundle: null, entitlements: null, skipCodesign: false, minBundleBytes: 1_000_000 };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--bundle') options.bundle = args[++i];
    else if (arg === '--entitlements') options.entitlements = args[++i];
    else if (arg === '--skip-codesign') options.skipCodesign = true;
    else if (arg === '--min-bundle-bytes') options.minBundleBytes = Number(args[++i]);
    else if (!options.app) options.app = arg;
    else {
      console.error(`unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  if (!options.app) {
    console.error('usage: verify-standalone-research.cjs <ExcerLock.app> [--bundle <file>] [--entitlements <file>] [--skip-codesign] [--min-bundle-bytes <n>]');
    process.exit(2);
  }
  const app = path.resolve(options.app);
  if (!fs.existsSync(app) || !fs.statSync(app).isDirectory()) {
    console.error(`not an app directory: ${app}`);
    process.exit(2);
  }

  const failures = [];
  const passed = [];
  verifyBundle(options.bundle ? path.resolve(options.bundle) : path.join(app, 'main.jsbundle'), options.minBundleBytes, failures, passed);
  verifyInfoPlist(app, failures, passed);
  verifyExpoPlist(app, failures, passed);
  if (!options.skipCodesign) verifyEntitlements(options, failures, passed);
  else if (options.entitlements) verifyEntitlements(options, failures, passed);
  scanMarkers(app, failures, passed);

  if (failures.length) {
    console.error('STANDALONE RESEARCH VERIFY FAIL:');
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  for (const line of passed) console.log(`VERIFY PASS: ${line}`);
  console.log('Standalone Linked Recorder research artifact verified.');
}

main();
