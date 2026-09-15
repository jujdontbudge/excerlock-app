// Executable coverage for the standalone Linked Recorder research artifact
// rules: the signed Release binary must boot from its embedded bundle with no
// expo-dev-client, no LAN/dev-server surface, and no OTA or production identity.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const linked = require('../plugins/linkedRecorderResearchConfig');
const { patchPodfile, EXCLUDED_CALL } = require('../plugins/withLinkedRecorderStandalone');
const verifier = path.join(__dirname, 'verify-standalone-research.cjs');

const APP_BUNDLE_ID = 'com.johansardar.excerlock.lab.linkedtrace';
const APP_GROUP = 'group.com.johansardar.excerlock.lab.linkedtrace';
// The lab embeds no client identity group at all; these are production shapes the
// artifact proof must reject, not values it must satisfy.
const PRODUCTION_SUPABASE_URL = 'https://production.supabase.co';
const PRODUCTION_ADAPTY_KEY = 'production-adapty-key';
const PRODUCTION_API_URL = 'https://api.excerlock.com';

function plistValue(value, indent) {
  const pad = '  '.repeat(indent);
  const childPad = '  '.repeat(indent + 1);
  if (Array.isArray(value)) {
    const items = value.map((item) => `${childPad}${plistValue(item, indent + 1)}`).join('\n');
    return `<array>\n${items}\n${pad}</array>`;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value)
      .map(([key, raw]) => `${childPad}<key>${key}</key>\n${childPad}${plistValue(raw, indent + 1)}`)
      .join('\n');
    return `<dict>\n${entries}\n${pad}</dict>`;
  }
  if (typeof value === 'boolean') return value ? '<true/>' : '<false/>';
  if (typeof value === 'number') return `<integer>${value}</integer>`;
  return `<string>${value}</string>`;
}

function plist(value) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n${plistValue(value, 0)}\n</plist>\n`;
}

function makeApp(root, overrides = {}) {
  const app = path.join(root, 'ExcerLock.app');
  fs.mkdirSync(app, { recursive: true });
  fs.writeFileSync(
    path.join(app, 'Info.plist'),
    plist({
      CFBundleIdentifier: APP_BUNDLE_ID,
      CFBundleDisplayName: 'ExcerLock Trace Lab',
      CFBundleURLTypes: [{ CFBundleURLSchemes: ['excerlock-linked-trace'] }],
      ...(overrides.info ?? {}),
    }),
  );
  fs.writeFileSync(path.join(app, 'Expo.plist'), plist({ EXUpdatesEnabled: false, EXUpdatesRuntimeVersion: '2-linked-recorder-1', ...(overrides.expo ?? {}) }));
  fs.mkdirSync(path.join(app, 'EXConstants.bundle'));
  fs.writeFileSync(
    path.join(app, 'EXConstants.bundle', 'app.config'),
    JSON.stringify({
      scheme: ['excerlock-linked-trace'],
      ios: { bundleIdentifier: APP_BUNDLE_ID },
      updates: { enabled: false, checkAutomatically: 'NEVER' },
      extra: {
        environment: 'lab',
      },
      ...(overrides.config ?? {}),
    }),
  );
  fs.writeFileSync(path.join(app, 'main.jsbundle'), `hermes-placeholder\nHow the test works\nShare Walking Recorder archive\n${overrides.bundle ?? ''}`);
  fs.writeFileSync(path.join(app, 'ExcerLock'), Buffer.from(`binary ${overrides.binary ?? 'LinkedTraceWriter'}`));
  fs.writeFileSync(
    path.join(app, 'entitlements.json'),
    JSON.stringify({
      'application-identifier': `AX3C2B78YD.${APP_BUNDLE_ID}`,
      'com.apple.security.application-groups': [APP_GROUP],
      ...(overrides.entitlements ?? {}),
    }),
  );
  return app;
}

function runVerifier(app, extra = []) {
  try {
    const stdout = execFileSync(process.execPath, [
      verifier,
      app,
      '--skip-codesign',
      '--entitlements',
      path.join(app, 'entitlements.json'),
      '--min-bundle-bytes',
      '0',
      ...extra,
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { status: 0, stdout, stderr: '' };
  } catch (error) {
    return { status: error.status, stdout: error.stdout ?? '', stderr: error.stderr ?? '' };
  }
}

function inTemp(body) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'standalone-research-test-'));
  try {
    return body(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('accepts a clean standalone research artifact', () => inTemp((root) => {
  const result = runVerifier(makeApp(root));
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /Standalone Linked Recorder research artifact verified/);
}));

test('rejects an artifact that carries the native dev client', () => inTemp((root) => {
  const result = runVerifier(makeApp(root, { binary: 'EXDevLauncher EXDevMenu expo-dev-client' }));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /EXDevLauncher/);
  assert.match(result.stderr, /expo-dev-client/);
}));

test('rejects a dev-client URL scheme or LAN Bonjour surface', () => inTemp((root) => {
  const result = runVerifier(
    makeApp(root, {
      info: {
        CFBundleURLTypes: [{ CFBundleURLSchemes: ['excerlock-linked-trace', 'exp+excerlock'] }],
        NSBonjourServices: ['_expo._tcp'],
      },
    }),
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /URL scheme\(s\) outside the lab identity: exp\+excerlock/);
  assert.match(result.stderr, /_expo\._tcp/);
}));

test('accepts the bundle-identifier scheme Expo registers next to the lab scheme', () => inTemp((root) => {
  const result = runVerifier(makeApp(root, { info: { CFBundleURLTypes: [{ CFBundleURLSchemes: ['excerlock-linked-trace', APP_BUNDLE_ID] }] } }));
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
}));

test('rejects production Google OAuth or universal-link routing into Trace Lab', () => inTemp((root) => {
  const result = runVerifier(
    makeApp(root, {
      info: { CFBundleURLTypes: [{ CFBundleURLSchemes: ['excerlock-linked-trace', 'com.googleusercontent.apps.174877771548-production'] }] },
      entitlements: { 'com.apple.developer.associated-domains': ['applinks:excerlock.com'] },
      config: {
        scheme: ['excerlock-linked-trace', 'com.googleusercontent.apps.174877771548-production'],
        ios: { bundleIdentifier: APP_BUNDLE_ID, associatedDomains: ['applinks:excerlock.com'] },
        extra: { environment: 'lab', clientAuth: { googleIosClientId: '174877771548-production.apps.googleusercontent.com' } },
      },
    }),
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /outside the lab identity: com\.googleusercontent\.apps\.174877771548-production/);
  assert.match(result.stderr, /associated domains \["applinks:excerlock\.com"\]/);
  assert.match(result.stderr, /embedded Expo config scheme is/);
  assert.match(result.stderr, /embedded Expo config carries associated domains/);
  assert.match(result.stderr, /carries client identity group clientAuth/);
}));

test('rejects an embedded Expo config that would boot outside the lab environment', () => inTemp((root) => {
  const result = runVerifier(
    makeApp(root, {
      config: {
        scheme: ['excerlock-linked-trace'],
        ios: { bundleIdentifier: 'com.johansardar.excerlock' },
        updates: { enabled: true, url: 'https://u.expo.dev/9a358379-d939-4c56-bcea-de3ac5699be2' },
        extra: { environment: 'dev', clientAuth: { googleIosClientId: 'fixture.apps.googleusercontent.com' } },
      },
    }),
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /extra\.environment is dev \(want lab\)/);
  assert.match(result.stderr, /updates\.enabled is true/);
  assert.match(result.stderr, /carries an OTA update URL/);
  assert.match(result.stderr, /ios\.bundleIdentifier is com\.johansardar\.excerlock \(want/);
}));

test('rejects an artifact without the embedded Expo config', () => inTemp((root) => {
  const app = makeApp(root);
  fs.rmSync(path.join(app, 'EXConstants.bundle'), { recursive: true });
  const result = runVerifier(app);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /missing embedded Expo config/);
}));

test('rejects an enabled OTA update URL', () => inTemp((root) => {
  const result = runVerifier(makeApp(root, { expo: { EXUpdatesEnabled: true, EXUpdatesURL: 'https://u.expo.dev/9a358379-d939-4c56-bcea-de3ac5699be2' } }));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /EXUpdatesEnabled/);
  assert.match(result.stderr, /OTA update URL/);
}));

test('rejects production identity, a production App Group, or a missing research bundle', () => inTemp((root) => {
  const app = makeApp(root, {
    info: { CFBundleIdentifier: 'com.johansardar.excerlock', CFBundleDisplayName: 'ExcerLock' },
    entitlements: {
      'application-identifier': 'AX3C2B78YD.com.johansardar.excerlock',
      'com.apple.security.application-groups': ['group.com.johansardar.excerlock'],
    },
  });
  fs.rmSync(path.join(app, 'main.jsbundle'));
  const result = runVerifier(app);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /CFBundleIdentifier is com\.johansardar\.excerlock/);
  assert.match(result.stderr, /missing embedded JS bundle/);
  assert.match(result.stderr, /App Groups are/);
}));

test('rejects a bundle that did not select the research screen', () => inTemp((root) => {
  const app = makeApp(root);
  fs.writeFileSync(path.join(app, 'main.jsbundle'), 'ordinary release bundle without the research route');
  const result = runVerifier(app);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /missing research screen marker: How the test works/);
}));

test('rejects a bundle that smuggled the dev-client JS modules', () => inTemp((root) => {
  const result = runVerifier(makeApp(root, { bundle: 'require("expo-dev-launcher")' }));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /contains forbidden module marker: expo-dev-launcher/);
}));

test('rejects production identity values embedded in the lab Expo config', () => inTemp((root) => {
  const result = runVerifier(
    makeApp(root, {
      config: {
        scheme: ['excerlock-linked-trace'],
        ios: { bundleIdentifier: APP_BUNDLE_ID },
        updates: { enabled: false, checkAutomatically: 'NEVER' },
        extra: {
          environment: 'lab',
          clientAuth: { supabaseUrl: PRODUCTION_SUPABASE_URL, supabaseAnonKey: 'production-anon' },
          clientSubscription: { adaptyKey: PRODUCTION_ADAPTY_KEY },
          clientApi: { url: PRODUCTION_API_URL },
        },
      },
    }),
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /carries client identity group clientAuth/);
  assert.match(result.stderr, /carries client identity group clientSubscription/);
  assert.match(result.stderr, /carries client identity group clientApi/);
}));

test('rejects a bundle that smuggled the production identity graph', () => inTemp((root) => {
  const result = runVerifier(makeApp(root, { bundle: 'SupabaseAuthAdapter AdaptySubscriptionAdapter createIdentityServices' }));
  assert.equal(result.status, 1);
  assert.match(result.stderr, /contains forbidden module marker: SupabaseAuthAdapter/);
  assert.match(result.stderr, /contains forbidden module marker: AdaptySubscriptionAdapter/);
  assert.match(result.stderr, /contains forbidden module marker: createIdentityServices/);
}));

test('standalone pod exclusion patches only the generated bare call and fails closed otherwise', () => {
  const generated = 'target \'ExcerLock\' do\n  use_expo_modules!\nend\n';
  const patched = patchPodfile(generated);
  assert.ok(patched.includes(EXCLUDED_CALL));
  assert.equal(patchPodfile(patched), patched, 'patching is idempotent');
  assert.throws(
    () => patchPodfile('target \'ExcerLock\' do\n  use_expo_modules!({ includeTests: true })\nend\n'),
    /could not exclude expo-dev-client/,
  );
});

test('the standalone environment is double opt-in and can never select production identity', () => {
  const flag = linked.TRACE_FLAG;
  assert.equal(linked.standaloneEnabled({ EXCERLOCK_ENV: 'lab', [flag]: '1' }), true);
  assert.equal(linked.standaloneEnabled({ EXCERLOCK_ENV: 'dev', [flag]: '1' }), false);
  assert.equal(linked.standaloneEnabled({ EXCERLOCK_ENV: 'lab' }), false);
  assert.throws(() => linked.assertResearchBuildAllowed({ EXCERLOCK_ENV: 'lab' }), /requires EXCERLOCK_LINKED_RECORDER_TRACE=1/);
  assert.equal(linked.assertResearchBuildAllowed({ EXCERLOCK_ENV: 'lab', [flag]: '1' }), true);
  assert.throws(() => linked.assertResearchBuildAllowed({ EXCERLOCK_ENV: 'preview', [flag]: '1' }), /EXCERLOCK_ENV=dev \(Metro\) or lab/);
  assert.throws(
    () => linked.assertResearchBuildAllowed({ EXCERLOCK_ENV: 'lab', [flag]: '1', EAS_BUILD: 'true' }),
    /cannot use EAS Build/,
  );
});
