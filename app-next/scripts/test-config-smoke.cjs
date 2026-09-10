/* global __dirname */
// Exercise Expo's real config loader, not Jest/tsx's already-installed TS hooks.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { resolve, dirname } = require('node:path');
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
test('actual Expo loader resolves external TS, preserves native plugins and excludes private credentials', () => {
  const result = spawnSync(process.execPath, [cli, 'config', '--type', 'public', '--json'], { cwd, env, encoding: 'utf8', timeout: 30_000 });
  assert.equal(result.status, 0, 'Expo config loading failed (output withheld)');
  const config = JSON.parse(result.stdout);
  assert.equal(config.extra.environment, 'preview');
  assert.ok(config.scheme.includes('com.googleusercontent.apps.fixture'));
  assert.equal(config.extra.clientAuth.googleRedirectUri, 'com.googleusercontent.apps.fixture:/oauthredirect');
  assert.equal(config.runtimeVersion, '1');
  assert.equal(config.updates.checkAutomatically, 'ON_LOAD');
  assert.equal(config.ios.bundleIdentifier, 'com.johansardar.excerlock');
  assert.ok(config.plugins.includes('./plugins/withScreenTimeExtensionValidation'));
  assert.ok(config.plugins.includes('./plugins/withMainAppIntent'));
  assert.ok(!result.stdout.includes(env.SENTRY_AUTH_TOKEN));
  assert.ok(!result.stdout.includes('SENTRY_AUTH_TOKEN'));
});
test('actual Expo loader refuses conflicting release environment', () => {
  const result = spawnSync(process.execPath, [cli, 'config', '--type', 'public', '--json'], {
    cwd, env: { ...env, EXCERLOCK_ENV: 'prod' }, encoding: 'utf8', timeout: 30_000,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Build profile and EXCERLOCK_ENV conflict/);
});
