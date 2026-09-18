import { enforcementTransitionEvents, type AppliedPolicy } from '../enforcement/enforcementAnalytics';

const pocket = { appState: 'background', source: 'background' } as const;
const inApp = { appState: 'active', source: 'foreground' } as const;
const shield: AppliedPolicy = { state: 'shield', relief: 'unlockedWalking' };
const walking: AppliedPolicy = { state: 'conditional', relief: 'unlockedWalking' };
const propped: AppliedPolicy = { state: 'conditional', relief: 'unlockedPropped' };
const gym: AppliedPolicy = { state: 'conditional', relief: 'unlockedAtGym' };
const open = (openReason: NonNullable<AppliedPolicy['openReason']>): AppliedPolicy => ({ state: 'open', relief: 'unlockedWalking', openReason });

test('a pocket walk that lifts shields while ExcerLock is closed reports the unlock and the lift', () => {
  expect(enforcementTransitionEvents(shield, walking, pocket)).toEqual([
    { name: 'unlock_completed', props: { method: 'walking', app_state: 'background', source: 'background' } },
    { name: 'shields_lifted', props: { app_state: 'background', source: 'background', reason: 'walking' } },
  ]);
});

test('each relief names its unlock method', () => {
  expect(enforcementTransitionEvents(shield, propped, inApp)[0]).toEqual({ name: 'unlock_completed', props: { method: 'propped', app_state: 'active', source: 'foreground' } });
  expect(enforcementTransitionEvents(shield, gym, { appState: 'background', source: 'geofence' })[0]).toEqual({ name: 'unlock_completed', props: { method: 'gym', app_state: 'background', source: 'geofence' } });
});

test('relief ending re-shields as a relock; a window opening from open is a window start', () => {
  expect(enforcementTransitionEvents(walking, shield, pocket)).toEqual([
    { name: 'shields_applied', props: { app_state: 'background', source: 'background', cause: 'relock' } },
  ]);
  expect(enforcementTransitionEvents(open('outsideWindow'), shield, { appState: 'inactive', source: 'manual' })).toEqual([
    { name: 'shields_applied', props: { app_state: 'inactive', source: 'manual', cause: 'window_start' } },
  ]);
});

test('open reasons map to lift reasons; an earned day is a lift but not a method unlock', () => {
  expect(enforcementTransitionEvents(shield, open('earned'), inApp)).toEqual([
    { name: 'shields_lifted', props: { app_state: 'active', source: 'foreground', reason: 'earned' } },
  ]);
  const reason = (policy: AppliedPolicy) => enforcementTransitionEvents(shield, policy, inApp).map((e) => e.props)[0];
  expect(reason(open('outsideWindow'))).toMatchObject({ reason: 'window_end' });
  expect(reason(open('lapsed'))).toMatchObject({ reason: 'lapsed' });
  expect(reason(open('disabled'))).toMatchObject({ reason: 'disabled' });
  expect(reason(open('deleting'))).toMatchObject({ reason: 'deleting' });
  expect(reason({ state: 'open', relief: 'unlockedWalking' })).toMatchObject({ reason: 'window_end' });
});

test('a fresh JS context reports the policy it found only when shields are up or relief is live', () => {
  expect(enforcementTransitionEvents(null, shield, { appState: 'unknown', source: 'geofence' })).toEqual([
    { name: 'shields_applied', props: { app_state: 'unknown', source: 'geofence', cause: 'boot' } },
  ]);
  expect(enforcementTransitionEvents(null, walking, pocket)).toEqual([
    { name: 'shields_lifted', props: { app_state: 'background', source: 'background', reason: 'walking' } },
  ]);
  expect(enforcementTransitionEvents(null, open('outsideWindow'), inApp)).toEqual([]);
  expect(enforcementTransitionEvents({ state: 'unknown', relief: 'unlockedWalking' }, shield, inApp)[0]!.props).toMatchObject({ cause: 'boot' });
});

test('unchanged shield state and unknown policies are silent', () => {
  expect(enforcementTransitionEvents(shield, shield, pocket)).toEqual([]);
  expect(enforcementTransitionEvents(walking, propped, pocket)).toEqual([]);
  expect(enforcementTransitionEvents(open('earned'), open('outsideWindow'), inApp)).toEqual([]);
  expect(enforcementTransitionEvents(shield, { state: 'unknown', relief: 'unlockedWalking' }, inApp)).toEqual([]);
});
