import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EVENT_NAMES, eventsOwnedBy, FLOW_SCREENS } from '@excerlock/analytics-events';
import { createPostHogAnalytics } from '../postHogAnalytics';
import { safeProperties, safeScreen } from '../privacy';
import { recordingClient } from './recordingClient';

describe('the name allowlist', () => {
  test('keeps only the properties the registry declares transmittable', () => {
    expect(
      safeProperties('rule_met', {
        activity: 'gym',
        mode: 'event',
        day: 3,
        window_bucket: 'first_hour',
        gymName: 'Anytime Fitness Kensington',
        latitude: 40.7,
        longitude: -73.9,
        goal: 45,
      }),
    ).toEqual({ activity: 'gym', mode: 'event', day: 3, window_bucket: 'first_hour' });
  });

  test('never sends the distance to a saved gym, even though the call site passes it', () => {
    const client = recordingClient();
    const analytics = createPostHogAnalytics(client, {
      isEnabled: () => true,
      isAnonymous: () => false,
    });
    analytics.track('gym_unlock_tapped', { distance: 42.7, preview: false });
    expect(client.captured).toEqual([{ event: 'gym_unlock_tapped', props: { preview: false } }]);
  });

  test('an event declared with no transmittable properties sends an empty payload', () => {
    expect(safeProperties('shields_applied', { ruleId: 'r-1', appCount: 7 })).toEqual({});
  });

  test('drops a property whose value is not an id, an enum, a number or a boolean', () => {
    expect(safeProperties('condition_created', { activity: 'walking', mode: undefined })).toEqual({
      activity: 'walking',
    });
    expect(safeProperties('condition_created', { activity: ['walking'], mode: 'state' })).toEqual({
      mode: 'state',
    });
  });
});

describe('the value floor', () => {
  test('drops a declared-enum property carrying an undeclared value', () => {
    expect(safeProperties('treadmill_scan_failed', { reason: 'timeout' })).toEqual({
      reason: 'timeout',
    });
    expect(
      safeProperties('treadmill_scan_failed', {
        reason: "Cannot read property 'id' of undefined at /Users/alex/gyms/Anytime.ts",
      }),
    ).toEqual({});
  });

  test('drops an activity or a screen the registry does not know', () => {
    expect(safeProperties('condition_created', { activity: 'swimming', mode: 'state' })).toEqual({
      mode: 'state',
    });
    expect(safeProperties('onboarding_screen_viewed', { screen: '/(tabs)/home' })).toEqual({});
  });
});

describe('the screen union', () => {
  test('accepts every screen the flow can reach', () => {
    for (const screen of FLOW_SCREENS) expect(safeScreen(screen)).toBe(screen);
    expect(safeScreen('Home')).toBe('Home');
  });

  test('rejects a route, a title, or a screen that does not exist', () => {
    expect(safeScreen('/(tabs)/home')).toBeNull();
    expect(safeScreen('Saved gyms')).toBeNull();
    expect(safeScreen('O99')).toBeNull();
  });

  test('a rejected screen reaches the client as nothing at all', () => {
    const client = recordingClient();
    createPostHogAnalytics(client, { isEnabled: () => true, isAnonymous: () => false }).screen(
      'Saved gyms',
    );
    expect(client.signals.filter((s) => s.kind === 'screen')).toEqual([]);
  });
});

describe('every event the app emits', () => {
  // Walks the source rather than trusting the registry to have kept up: an event added at a call
  // site without a registry entry is dropped silently at the boundary, which is exactly the kind
  // of instrumentation bug nobody notices until a funnel is empty.
  const source = join(__dirname, '..', '..', '..');
  const TRACK = /analytics\.track\(\s*'([a-z0-9_]+)'/g;
  const SCREEN = /analytics\.screen\(\s*'([A-Za-z0-9]+)'/g;

  function sourceFiles(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(path);
      return /\.tsx?$/.test(entry.name) ? [path] : [];
    });
  }

  const files = sourceFiles(source).map((path) => readFileSync(path, 'utf8'));
  const emitted = [...new Set(files.flatMap((text) => [...text.matchAll(TRACK)].map((m) => m[1])))];
  const screened = [...new Set(files.flatMap((text) => [...text.matchAll(SCREEN)].map((m) => m[1])))];

  test('is a registered, client-owned event', () => {
    expect(emitted.length).toBeGreaterThan(0);
    expect(emitted.filter((event) => !EVENT_NAMES.includes(event as never))).toEqual([]);
    const client = new Set<string>(eventsOwnedBy('client'));
    expect(emitted.filter((event) => !client.has(event))).toEqual([]);
  });

  test('names a screen the transport will accept', () => {
    expect(screened.length).toBeGreaterThan(0);
    expect(screened.filter((screen) => safeScreen(screen) === null)).toEqual([]);
  });

  test('never passes a gym, a coordinate or an app selection through the boundary', () => {
    const forbidden = ['gymName', 'latitude', 'longitude', 'address', 'appName', 'bundleId'];
    const leaked = eventsOwnedBy('client').flatMap((event) => {
      const payload = Object.fromEntries(forbidden.map((key) => [key, 'leaked']));
      const sent = safeProperties(event as never, payload);
      return Object.keys(sent).map((key) => `${event}.${key}`);
    });
    expect(leaked).toEqual([]);
  });
});

describe('an unregistered event', () => {
  test('is dropped rather than sent under a name no insight knows', () => {
    const client = recordingClient();
    const analytics = createPostHogAnalytics(client, {
      isEnabled: () => true,
      isAnonymous: () => false,
    });
    analytics.track('gym_visited_at_home', { address: '12 Kensington High Street' });
    expect(client.captured).toEqual([]);
  });

  test('does not stop the next registered event', () => {
    const client = recordingClient();
    const analytics = createPostHogAnalytics(client, {
      isEnabled: () => true,
      isAnonymous: () => false,
    });
    analytics.track('made_up_event');
    analytics.track('shields_applied');
    expect(client.captured).toEqual([{ event: 'shields_applied', props: {} }]);
  });
});

test('the adapter is the only place in src that imports the PostHog SDK', () => {
  const offenders: string[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__') walk(path);
      } else if (
        /\.tsx?$/.test(entry.name) &&
        readFileSync(path, 'utf8').includes("from 'posthog-react-native'")
      ) {
        offenders.push(path);
      }
    }
  };
  walk(join(__dirname, '..', '..', '..'));
  expect(offenders.map((path) => path.split('/src/')[1]).sort()).toEqual([
    'adapters/analytics/createAnalyticsAdapter.ts',
    'adapters/analytics/postHogOptions.ts',
  ]);
});
