/* global __dirname */
// Exercise Expo's real config loader, not Jest/tsx's already-installed TS hooks.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { resolve, dirname } = require('node:path');
require('tsx/cjs');
const { readClientConfiguration } = require('../src/runtime/clientConfiguration');
const cwd = resolve(__dirname, '..');
const cli = resolve(dirname(require.resolve('expo/package.json')), 'bin/cli');
const env = {
  ...process.env, CI: '1', NODE_ENV: 'production', EXCERLOCK_ENV: 'preview', EAS_BUILD_PROFILE: 'preview', EAS_BUILD: 'false',
  EXPO_PUBLIC_ADAPTY_KEY: 'fixture-adapty', EXPO_PUBLIC_POSTHOG_KEY: 'fixture-posthog',
  EXPO_PUBLIC_POSTHOG_HOST: 'https://us.i.posthog.com', SENTRY_DSN: 'https://public@example.com/1',
  SENTRY_AUTH_TOKEN: 'fixture-private-must-never-export', EXPO_PUBLIC_SUPABASE_URL: 'https://fixture.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'fixture-anon', EXPO_PUBLIC_API_URL: 'https://api.example.com',
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: 'fixture.apps.googleusercontent.com',
};
for (const [profile, environment] of [['development', 'dev'], ['preview', 'preview'], ['production', 'prod']]) {
test(`actual Expo loader preserves ${profile} native configuration and excludes private credentials`, () => {
  const result = spawnSync(process.execPath, [cli, 'config', '--type', 'public', '--json'], { cwd, env: { ...env, EAS_BUILD_PROFILE: profile, EXCERLOCK_ENV: environment }, encoding: 'utf8', timeout: 30_000 });
  assert.equal(result.status, 0, 'Expo config loading failed (output withheld)');
  const config = JSON.parse(result.stdout);
  assert.equal(config.extra.environment, environment);
  assert.ok(config.scheme.includes('com.googleusercontent.apps.fixture'));
  assert.equal(config.extra.clientAuth.googleRedirectUri, 'com.googleusercontent.apps.fixture:/oauthredirect');
  assert.equal(config.runtimeVersion, '2');
  assert.equal(config.updates.checkAutomatically, 'ON_LOAD');
  assert.deepEqual(config.updates.requestHeaders, { 'expo-channel-name': require('../eas.json').build[profile].channel });
  assert.equal(config.ios.bundleIdentifier, 'com.johansardar.excerlock');
  assert.deepEqual(config.ios.entitlements['com.apple.security.application-groups'], ['group.com.johansardar.excerlock']);
  assert.ok(config.plugins.includes('./plugins/withScreenTimeExtensionValidation'));
  assert.ok(config.plugins.includes('./plugins/withMainAppIntent'));
  assert.ok(config.plugins.includes('./modules/excerlock-startup/app.plugin'));
  assert.ok(!result.stdout.includes(env.SENTRY_AUTH_TOKEN));
  assert.ok(!result.stdout.includes('SENTRY_AUTH_TOKEN'));
});
}
test('actual Expo loader creates an isolated local-only Linked Recorder research config', () => {
  const researchEnv = {
    ...env,
    NODE_ENV: 'production',
    EXCERLOCK_ENV: 'dev',
    EXCERLOCK_LINKED_RECORDER_TRACE: '1',
    EAS_BUILD: 'false',
  };
  delete researchEnv.EAS_BUILD_PROFILE;
  const result = spawnSync(process.execPath, [cli, 'config', '--type', 'public', '--json'], {
    cwd, env: researchEnv, encoding: 'utf8', timeout: 30_000,
  });
  assert.equal(result.status, 0, 'Linked Recorder Expo config loading failed (output withheld)');
  const config = JSON.parse(result.stdout);
  assert.equal(config.name, 'ExcerLock');
  assert.equal(config.ios.infoPlist.CFBundleDisplayName, 'ExcerLock Trace Lab');
  assert.equal(config.ios.bundleIdentifier, 'com.johansardar.excerlock.lab.linkedtrace');
  assert.deepEqual(config.ios.entitlements['com.apple.security.application-groups'], ['group.com.johansardar.excerlock.lab.linkedtrace']);
  const deviceActivityPlugin = config.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === 'react-native-device-activity');
  assert.equal(deviceActivityPlugin?.[1]?.appGroup, 'group.com.johansardar.excerlock.lab.linkedtrace');
  assert.deepEqual(config.scheme.filter((value) => value.startsWith('excerlock')), ['excerlock-linked-trace']);
  assert.equal(config.runtimeVersion, '2-linked-recorder-1');
  assert.equal(config.updates.enabled, false);
  assert.equal(config.updates.checkAutomatically, 'NEVER');
  assert.equal(config.updates.url, undefined);
  assert.equal(config.updates.requestHeaders, undefined);
  assert.deepEqual(config.extra.clientObservability, {
    posthogApiKey: 'linked-trace-local',
    posthogHost: 'https://localhost',
    sentryDsn: 'https://localhost',
  });
  assert.equal(config.extra.linkedRecorderResearch, undefined);
  assert.doesNotThrow(() => readClientConfiguration(config.extra));
  assert.ok(!config.plugins.some((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) === '@sentry/react-native/expo'));
  assert.ok(!result.stdout.includes(researchEnv.SENTRY_AUTH_TOKEN));
});

test('actual Expo loader creates the standalone lab research config with an embedded-bundle runtime', () => {
  const labEnv = {
    ...env,
    NODE_ENV: 'production',
    EXCERLOCK_ENV: 'lab',
    EXCERLOCK_LINKED_RECORDER_TRACE: '1',
    EAS_BUILD: 'false',
  };
  delete labEnv.EAS_BUILD_PROFILE;
  const result = spawnSync(process.execPath, [cli, 'config', '--type', 'public', '--json'], {
    cwd, env: labEnv, encoding: 'utf8', timeout: 30_000,
  });
  assert.equal(result.status, 0, 'Linked Recorder lab Expo config loading failed (output withheld)');
  const config = JSON.parse(result.stdout);
  assert.equal(config.extra.environment, 'lab');
  assert.equal(config.ios.infoPlist.CFBundleDisplayName, 'ExcerLock Trace Lab');
  assert.equal(config.ios.bundleIdentifier, 'com.johansardar.excerlock.lab.linkedtrace');
  assert.deepEqual(config.ios.entitlements['com.apple.security.application-groups'], ['group.com.johansardar.excerlock.lab.linkedtrace']);
  assert.deepEqual(config.scheme.filter((value) => value.startsWith('excerlock')), ['excerlock-linked-trace']);
  assert.equal(config.runtimeVersion, '2-linked-recorder-1');
  assert.equal(config.updates.enabled, false);
  assert.equal(config.updates.url, undefined);
  assert.deepEqual(config.extra.clientObservability, {
    posthogApiKey: 'linked-trace-local',
    posthogHost: 'https://localhost',
    sentryDsn: 'https://localhost',
  });
  assert.doesNotThrow(() => readClientConfiguration(config.extra));
  // The standalone release build must not carry the dev client in any form;
  // the exclusion plugin is what removes its pods from the generated Podfile.
  assert.ok(!config.plugins.some((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) === 'expo-dev-client'));
  assert.ok(config.plugins.includes('./plugins/withLinkedRecorderStandalone'));
  assert.ok(!config.plugins.some((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) === '@sentry/react-native/expo'));
  assert.ok(!result.stdout.includes(labEnv.SENTRY_AUTH_TOKEN));
});

test('actual Expo loader refuses the lab environment without the research opt-in', () => {
  const result = spawnSync(process.execPath, [cli, 'config', '--type', 'public', '--json'], {
    cwd,
    env: { ...env, EXCERLOCK_ENV: 'lab', EAS_BUILD: 'false' },
    encoding: 'utf8',
    timeout: 30_000,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /EXCERLOCK_ENV=lab requires EXCERLOCK_LINKED_RECORDER_TRACE=1/);
});

test('actual Expo loader refuses malformed Linked Recorder opt-in values', () => {
  const result = spawnSync(process.execPath, [cli, 'config', '--type', 'public', '--json'], {
    cwd,
    env: { ...env, EXCERLOCK_ENV: 'dev', EXCERLOCK_LINKED_RECORDER_TRACE: '0' },
    encoding: 'utf8',
    timeout: 30_000,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must be exactly 1 or unset/);
});

test('actual Expo loader refuses Linked Recorder research mode in EAS Build', () => {
  const result = spawnSync(process.execPath, [cli, 'config', '--type', 'public', '--json'], {
    cwd,
    env: { ...env, EXCERLOCK_ENV: 'dev', EXCERLOCK_LINKED_RECORDER_TRACE: '1', EAS_BUILD: 'true' },
    encoding: 'utf8',
    timeout: 30_000,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /local-only and cannot use EAS Build/);
});

test('actual Expo loader refuses conflicting release environment', () => {
  const result = spawnSync(process.execPath, [cli, 'config', '--type', 'public', '--json'], {
    cwd, env: { ...env, EXCERLOCK_ENV: 'prod' }, encoding: 'utf8', timeout: 30_000,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Build profile and EXCERLOCK_ENV conflict/);
});
