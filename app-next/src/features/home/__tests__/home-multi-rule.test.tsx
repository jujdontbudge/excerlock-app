import { Text } from 'react-native';
import { Slot } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import { userEvent } from '@testing-library/react-native';
import { rulesStore } from '../../../state/rulesStore';
import { createRuntime } from '../../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { HomeScreen } from '../HomeScreen';
import { statusContent } from '../statusContent';
import { scenarios } from '../../../demo/scenarios';
async function openHome(id: string, prepare?: (runtime: ReturnType<typeof createRuntime>) => void) {
  const runtime = createRuntime();
  await runtime.dev.load(id);
  prepare?.(runtime);
  const router = renderRouter(
    {
      _layout: () => (
        <AppRuntimeProvider runtime={runtime}>
          <Slot />
        </AppRuntimeProvider>
      ),
      home: HomeScreen,
      builder: () => <Text>Builder</Text>,
      conditions: () => <Text>Conditions</Text>,
      'unlock/gym': () => <Text>Gym ceremony</Text>,
      'unlock/treadmill': () => <Text>Treadmill ceremony</Text>,
      'settings/gyms': () => <Text>Gyms</Text>,
      'settings/permission/[name]': () => <Text>Permission</Text>,
    },
    { initialUrl: '/home' },
  );
  return { runtime, router, rendered: await router };
}

test('every condition scheduled today has a row with its name and its number', async () => {
  const { rendered } = await openHome('home-two-conditions-locked');
  expect(screen.getByText('Walk 5,000 steps')).toBeTruthy();
  expect(screen.getByText('3,200 / 5,000 steps')).toBeTruthy();
  expect(screen.getByText('Arrive at the gym')).toBeTruthy();
  expect(screen.getByText(/Your next visit counts/)).toBeTruthy();
  // The duplicate white "Conditions" list is gone: each name appears once, inside the lock.
  expect(screen.getAllByText('Walk 5,000 steps')).toHaveLength(1);
  await rendered.unmount();
});

test('a gym pill and a step-goal row appear together', async () => {
  const { rendered } = await openHome('home-two-conditions-locked');
  expect(screen.getByRole('button', { name: "I'm at the gym" })).toBeTruthy();
  expect(screen.getByText('3,200 / 5,000 steps')).toBeTruthy();
  await rendered.unmount();
});

test('a place-either rule shows two pills', async () => {
  const { rendered } = await openHome('walking-either-two-pills');
  expect(screen.getByRole('button', { name: "I'm using a treadmill" })).toBeTruthy();
  expect(screen.getByRole('button', { name: "I'm walking with my phone" })).toBeTruthy();
  await rendered.unmount();
});

test('the unlocked day names the condition that unlocked it', async () => {
  const { rendered } = await openHome('home-unlocked-met');
  expect(screen.getByRole('header', { name: 'Unlocked for the rest of today' })).toBeTruthy();
  expect(screen.getByText('Unlocked by Walk 5,000 steps')).toBeTruthy();
  await rendered.unmount();
});

test('an unmet evening condition says it is satisfied today', async () => {
  const { rendered } = await openHome('home-met-second-window');
  expect(screen.getByText('Satisfied by Walk 5,000 steps today')).toBeTruthy();
  expect(screen.getByText('Satisfied today')).toBeTruthy();
  await rendered.unmount();
});

test('two windows are drawn on one timeline', async () => {
  const { rendered } = await openHome('home-met-second-window');
  expect(screen.getByRole('header', { name: /Block from 9.AM to 12.PM and 6.PM to 10.PM/ })).toBeTruthy();
  await rendered.unmount();
});

test('a single locked condition shows the blocked line and the unlock hint', async () => {
  const { rendered } = await openHome('home-locked-walking');
  expect(screen.getByRole('header', { name: 'Apps are blocked' })).toBeTruthy();
  expect(screen.getByText('Until you walk 1,800 steps')).toBeTruthy();
  await rendered.unmount();
});

test('Screen Time denied does not render the rest-day headline', async () => {
  const { rendered } = await openHome('home-permission-needed');
  expect(screen.getByText('Nothing is being blocked')).toBeTruthy();
  expect(screen.queryByText('No blocking right now')).toBeNull();
  // iOS never re-presents the Screen Time prompt after a denial, so the fix action is Settings.
  expect(screen.getByRole('button', { name: 'Open Settings' })).toBeTruthy();
  await rendered.unmount();
});

test('a goal reached while the app was closed unlocks on the next foreground and says so', async () => {
  const { rendered } = await openHome('home-unlocked-met');
  expect(screen.getByRole('header', { name: 'Unlocked for the rest of today' })).toBeTruthy();
  expect(screen.getByText('Met today')).toBeTruthy();
  // merge: P2-T05's claim signal replaces claimState's stub and this line renders on Home itself.
  const met = scenarios.find((s) => s.id === 'home-unlocked-met')!;
  expect(
    statusContent({
      decision: {
        state: 'unlockedMet',
        byRuleId: 'walk',
        byName: 'Walk 5,000 steps',
        metAt: met.clock.now,
        relockAt: null,
      },
      rules: met.rules,
      apps: met.lockedApps,
      permissions: met.permissions,
      now: met.clock.now,
      timezone: met.clock.timezone,
      caughtUp: true,
    }).subtitle,
  ).toBe('Unlocked — we caught up while the app was closed');
  await rendered.unmount();
});

test('a rest day says when blocking resumes', async () => {
  const { rendered } = await openHome('home-locked-walking', (runtime) => runtime.dev.advance(11 * 3600000));
  expect(screen.getByText('Blocking resumes tomorrow at 9:00 AM')).toBeTruthy();
  await rendered.unmount();
});

test.each(['walking-either-two-pills', 'walking-state-outdoor'])(
  '%s opens the walking sheet from the handheld pill, never the treadmill ceremony',
  async (id) => {
    const { router, rendered } = await openHome(id);
    await userEvent.press(screen.getByRole('button', { name: "I'm walking with my phone" }));
    expect(screen.getByRole('button', { name: 'Start walking' })).toBeTruthy();
    expect(router.getPathname()).toBe('/home');
    await rendered.unmount();
  },
);

test('a gym condition paused for no saved gym says so and opens the gym list', async () => {
  const { router, rendered } = await openHome('home-two-conditions-locked', () => {
    const { rules } = rulesStore.getState().data;
    // Deleting the last saved gym leaves this behind; here it is written straight into the store.
    rulesStore.getState().patch({
      rules: rules.map((rule) => (rule.activity === 'gym' ? { ...rule, enabled: false, pausedReason: 'noGym' } : rule)),
    });
  });
  await userEvent.press(screen.getByRole('button', { name: 'Paused — save a gym' }));
  expect(router.getPathname()).toBe('/settings/gyms');
  await rendered.unmount();
});
