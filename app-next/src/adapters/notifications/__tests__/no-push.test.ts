import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { NOTIFICATION_IDS } from '../catalog';

const appRoot = join(__dirname, '..', '..', '..', '..');
const moduleRoot = join(__dirname, '..');

const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return entry === '__tests__' ? [] : sources(path);
    return /\.tsx?$/.test(entry) ? [path] : [];
  });

test('the catalog has exactly three distinct ids', () => {
  const ids = Object.values(NOTIFICATION_IDS);
  expect(ids).toHaveLength(3);
  expect(new Set(ids).size).toBe(3);
  expect(Object.keys(NOTIFICATION_IDS).sort()).toEqual(['shieldOpen', 'trialReminder', 'walkLeaseWarning']);
});

test('withNoPush stays first in the app config and no plugin can add the push entitlement', () => {
  const config = JSON.parse(readFileSync(join(appRoot, 'app.json'), 'utf8')) as {
    expo: { plugins: (string | [string, ...unknown[]])[] };
  };
  const names = config.expo.plugins.map((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin));
  expect(names[0]).toBe('./plugins/withNoPush');
  expect(names).not.toContain('expo-notifications');
  expect(readFileSync(join(appRoot, 'app.json'), 'utf8')).not.toContain('aps-environment');
});

test('withNoPush strips aps-environment from the entitlements it is handed', async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const withNoPush = require(join(appRoot, 'plugins', 'withNoPush.js')) as (config: object) => {
    mods: { ios: { entitlements: (config: object) => Promise<{ modResults: Record<string, unknown> }> } };
  };
  const config = withNoPush({ name: 'ExcerLock', slug: 'excerlock' });
  const result = await config.mods.ios.entitlements({
    ...config,
    modRequest: { platform: 'ios', modName: 'entitlements', projectRoot: appRoot, platformProjectRoot: appRoot, projectName: 'ExcerLock', introspect: true },
    modResults: { 'aps-environment': 'development', 'com.apple.developer.family-controls': true },
  });
  expect(result.modResults).toEqual({ 'com.apple.developer.family-controls': true });
});

test('the adapter never touches a push token, a remote payload or a background task', () => {
  const forbidden = [
    'getExpoPushTokenAsync',
    'getDevicePushTokenAsync',
    'addPushTokenListener',
    'setAutoServerRegistrationEnabledAsync',
    'registerTaskAsync',
    'subscribeToTopicAsync',
    'expo-server-sdk',
  ];
  for (const path of sources(moduleRoot)) {
    const source = readFileSync(path, 'utf8');
    for (const api of forbidden) expect(source).not.toContain(api);
  }
});
