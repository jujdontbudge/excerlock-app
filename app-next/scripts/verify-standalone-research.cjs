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
//   --entitlements <file>      Entitlements plist/JSON instead of codesign (tests)
//   --skip-codesign            Do not invoke codesign (fixture tests)
//   --min-bundle-bytes <n>     Minimum embedded bundle size (default 1000000)
/* global process */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const plist = require('@expo/plist').default;

const APP_BUNDLE_ID = 'com.johansardar.excerlock.lab.linkedtrace';
const APP_DISPLAY_NAME = 'ExcerLock Trace Lab';
const APP_GROUP = 'group.com.johansardar.excerlock.lab.linkedtrace';
const TEAM = 'AX3C2B78YD';
const SCHEME = 'excerlock-linked-trace';
const LAB_GOOGLE_IOS_CLIENT_ID = 'linked-trace-local.apps.googleusercontent.com';
const OTA_PROJECT_URL = 'u.expo.dev/9a358379';
const MAX_SCAN_BYTES = 200 * 1024 * 1024;
// Expo registers the bundle identifier as a URL scheme next to the configured
// one; both are lab-only. Anything else (dev-client, production, Google OAuth)
// would route another app's links into Trace Lab.
const LAB_URL_SCHEMES = [SCHEME, APP_BUNDLE_ID];
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

// Xcode writes binary plists into device artifacts; only those need plutil
// (macOS). XML plists (fixtures, codesign output) parse in-process anywhere.
function parsePlist(data) {
  if (data.subarray(0, 6).toString('latin1') === 'bplist') {
    return JSON.parse(execFileSync('plutil', ['-convert', 'json', '-o', '-', '-'], { input: data, encoding: 'utf8' }));
  }
  return plist.parse(data.toString('utf8'));
}

function readPlist(file) {
  return parsePlist(fs.readFileSync(file));
}

function readEntitlements(options) {
  if (options.entitlements) {
    const raw = fs.readFileSync(options.entitlements);
    try {
      return JSON.parse(raw.toString('utf8'));
    } catch {
      return parsePlist(raw);
    }
  }
  const dumped = execFileSync('codesign', ['-d', '--entitlements', ':-', options.app], {
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return parsePlist(dumped);
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

// expo-constants embeds the public Expo config the JS runtime boots from. A
// native project prebuilt for lab but bundled under another environment
// verifies everywhere else and still throws at AppRuntimeProvider boot.
function verifyEmbeddedConfig(app, failures, passed) {
  const configPath = path.join(app, 'EXConstants.bundle', 'app.config');
  if (!fs.existsSync(configPath)) {
    failures.push(`missing embedded Expo config: ${configPath}`);
    return;
  }
  const before = failures.length;
  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    failures.push('embedded Expo config is not valid JSON');
    return;
  }
  const environment = config.extra?.environment;
  if (environment !== 'lab') failures.push(`embedded Expo config extra.environment is ${String(environment)} (want lab)`);
  if (config.updates?.enabled !== false) failures.push(`embedded Expo config updates.enabled is ${String(config.updates?.enabled)} (want false)`);
  if (config.updates?.url !== undefined) failures.push('embedded Expo config carries an OTA update URL');
  if (config.ios?.bundleIdentifier !== APP_BUNDLE_ID) failures.push(`embedded Expo config ios.bundleIdentifier is ${String(config.ios?.bundleIdentifier)} (want ${APP_BUNDLE_ID})`);
  if (JSON.stringify(config.scheme) !== JSON.stringify([SCHEME])) failures.push(`embedded Expo config scheme is ${JSON.stringify(config.scheme)} (want exactly ${JSON.stringify([SCHEME])})`);
  if (config.ios?.associatedDomains !== undefined) failures.push('embedded Expo config carries associated domains');
  if (config.extra?.clientAuth?.googleIosClientId !== LAB_GOOGLE_IOS_CLIENT_ID) {
    failures.push(`embedded Expo config clientAuth.googleIosClientId is ${String(config.extra?.clientAuth?.googleIosClientId)} (want ${LAB_GOOGLE_IOS_CLIENT_ID})`);
  }
  if (failures.length === before) passed.push('embedded Expo config boots the lab environment with updates off and lab-only identifiers');
}

function verifyInfoPlist(app, failures, passed) {
  const infoPlist = path.join(app, 'Info.plist');
  if (!fs.existsSync(infoPlist)) {
    failures.push(`missing Info.plist: ${infoPlist}`);
    return;
  }
  const before = failures.length;
  const info = readPlist(infoPlist);
  if (info.CFBundleIdentifier !== APP_BUNDLE_ID) failures.push(`CFBundleIdentifier is ${String(info.CFBundleIdentifier)} (want ${APP_BUNDLE_ID})`);
  if (info.CFBundleDisplayName !== APP_DISPLAY_NAME) failures.push(`CFBundleDisplayName is ${String(info.CFBundleDisplayName)} (want ${APP_DISPLAY_NAME})`);
  const schemes = urlSchemes(info);
  if (!schemes.includes(SCHEME)) failures.push(`Info.plist URL schemes ${JSON.stringify(schemes)} miss ${SCHEME}`);
  const foreign = schemes.filter((scheme) => !LAB_URL_SCHEMES.includes(scheme));
  if (foreign.length) failures.push(`Info.plist carries URL scheme(s) outside the lab identity: ${foreign.join(', ')}`);
  const bonjour = Array.isArray(info.NSBonjourServices) ? info.NSBonjourServices : [];
  if (bonjour.some((service) => String(service).replace(/\.$/, '') === '_expo._tcp')) {
    failures.push('Info.plist advertises the _expo._tcp dev-server Bonjour service');
  }
  for (const key of ['NSLocalNetworkUsageDescription', 'DEV_CLIENT_DEFAULT_LAUNCHER_URL', 'DEV_CLIENT_TRY_TO_LAUNCH_LAST_BUNDLE']) {
    if (info[key] !== undefined) failures.push(`Info.plist carries dev-client key ${key}`);
  }
  if (failures.length === before) {
    passed.push(`Info.plist identity ${info.CFBundleIdentifier} with lab-only URL schemes and no dev-client surface`);
  }
}

function verifyExpoPlist(app, failures, passed) {
  const expoPlist = path.join(app, 'Expo.plist');
  if (!fs.existsSync(expoPlist)) {
    failures.push('missing Expo.plist (OTA state is unknown)');
    return;
  }
  const before = failures.length;
  const expo = readPlist(expoPlist);
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
  const domains = entitlements['com.apple.developer.associated-domains'];
  if (domains !== undefined) failures.push(`signature claims associated domains ${JSON.stringify(domains)} (universal links must stay with production ExcerLock)`);
  if (failures.length === before) passed.push('signature carries the isolated lab identity and App Group only, with no associated domains');
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
  const options = { app: null, entitlements: null, skipCodesign: false, minBundleBytes: 1_000_000 };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--entitlements') options.entitlements = args[++i];
    else if (arg === '--skip-codesign') options.skipCodesign = true;
    else if (arg === '--min-bundle-bytes') options.minBundleBytes = Number(args[++i]);
    else if (!options.app) options.app = arg;
    else {
      console.error(`unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  if (!options.app) {
    console.error('usage: verify-standalone-research.cjs <ExcerLock.app> [--entitlements <file>] [--skip-codesign] [--min-bundle-bytes <n>]');
    process.exit(2);
  }
  const app = path.resolve(options.app);
  if (!fs.existsSync(app) || !fs.statSync(app).isDirectory()) {
    console.error(`not an app directory: ${app}`);
    process.exit(2);
  }

  const failures = [];
  const passed = [];
  verifyBundle(path.join(app, 'main.jsbundle'), options.minBundleBytes, failures, passed);
  verifyEmbeddedConfig(app, failures, passed);
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
