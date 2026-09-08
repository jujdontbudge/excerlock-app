import { shieldContent } from '../../../domain/shieldContent';
import {
  APP_GROUP_KEYS,
  FACTS_SCHEMA_VERSION,
  readFacts,
  readUsage,
  USAGE_HISTORY_DAYS,
  writeFacts,
  writeUsageDay,
} from '../appGroup';
import { NATIVE_CAUSE, publishShieldContent } from '../shieldPublisher';
import { deviceActivityDouble } from './DeviceActivityDouble';

const facts = {
  shieldsDesired: 'up' as const,
  unlockUntil: null,
  leaseUntil: null,
  sessionId: null,
  watermark: '2026-09-07T13:00:00.000Z',
  entitled: true,
  planHash: 'abc',
  shieldContentByMonitor: {},
};

test('facts round-trip under their schema version and a foreign version reads as nothing', () => {
  const native = deviceActivityDouble();

  expect(writeFacts(native.api, facts)).toEqual({ schemaVersion: FACTS_SCHEMA_VERSION, ...facts });
  expect(readFacts(native.api)).toMatchObject({ shieldsDesired: 'up', entitled: true });

  native.shared.set(APP_GROUP_KEYS.facts, { ...facts, schemaVersion: FACTS_SCHEMA_VERSION + 1 });
  expect(readFacts(native.api)).toBeNull();
});

test('the usage record keeps a fortnight of days and drops the oldest', () => {
  const native = deviceActivityDouble();
  for (let index = 0; index < USAGE_HISTORY_DAYS + 3; index++) {
    writeUsageDay(native.api, `2026-09-${String(index + 1).padStart(2, '0')}`, index * 5);
  }
  const stored = readUsage(native.api);

  expect(Object.keys(stored.days)).toHaveLength(USAGE_HISTORY_DAYS);
  expect(stored.days['2026-09-01']).toBeUndefined();
  expect(stored.days['2026-09-17']).toBe(80);
});

test('an unreadable usage record reads as no measured days', () => {
  const native = deviceActivityDouble();
  native.shared.set(APP_GROUP_KEYS.usage, { schemaVersion: 99, days: { '2026-09-07': 400 } });

  expect(readUsage(native.api).days).toEqual({});
});

test('the shield the user sees is published with its cause last', () => {
  const native = deviceActivityDouble();
  const content = shieldContent({ cause: 'locked', goal: 'pending', canNotify: true });

  publishShieldContent(native.api, { cause: 'locked', content }, {});

  expect([...native.shared.keys()].at(-1)).toBe(APP_GROUP_KEYS.currentCause);
  expect(native.shared.get(APP_GROUP_KEYS.currentCause)).toBe(NATIVE_CAUSE.locked);
  expect(native.shared.get(APP_GROUP_KEYS.runtimeContext)).toMatchObject({
    cause: 'fullLock',
    offerSubtitle: content.subtitle,
    routeHomeAvailable: true,
    title: content.title,
  });
  expect(native.shared.get(APP_GROUP_KEYS.copyOverrides)).toEqual({
    fullLock: { title: content.title, subtitle: content.subtitle },
  });
});

test('a shield with nowhere to send the user offers no route home', () => {
  const native = deviceActivityDouble();
  const content = shieldContent({ cause: 'locked', goal: 'pending', canNotify: false });

  publishShieldContent(native.api, { cause: 'locked', content }, {});

  expect(native.shared.get(APP_GROUP_KEYS.runtimeContext)).toMatchObject({ routeHomeAvailable: false, primary: 'Close' });
});

test('every monitor carries its own window subtitle', () => {
  const native = deviceActivityDouble();
  const window = shieldContent({ cause: 'lockWindow', goal: 'pending', canNotify: true });

  publishShieldContent(native.api, { cause: 'locked', content: shieldContent({ cause: 'locked', goal: 'pending', canNotify: true }) }, {
    'excerlock.lock.one': window,
  });

  expect(native.shared.get(APP_GROUP_KEYS.lockWindowContexts)).toEqual({
    'excerlock.lock.one': {
      cause: 'lockWindow',
      offerSubtitle: window.subtitle,
      routeHomeAvailable: true,
      title: window.title,
      subtitle: window.subtitle,
      primary: window.primary,
      secondary: window.secondary,
    },
  });
  expect(window.subtitle).toContain('Blocking has started.');
});
