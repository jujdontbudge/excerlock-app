import { act, screen, userEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { renderRouter } from 'expo-router/testing-library';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { permissionsStore, emptyPermissions } from '../../../state/permissionsStore';
import { rulesStore } from '../../../state/rulesStore';
import { settingsStore } from '../../../state/settingsStore';
import { SetupFlow } from '../SetupFlow';
import type { Permissions } from '../../../domain/types';

jest.mock('../../../motion/haptics', () => ({ feedback: jest.fn() }));
const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
beforeEach(() => openSettings.mockClear());

const chosen = { handle: { token: 'opaque-fake' }, isEmpty: false };
async function renderFlow(
  scenario: string,
  permissions: Partial<Permissions>,
  { account = false, apps = false, promptMode = 'grant' as 'grant' | 'deny', gyms = true } = {},
) {
  const runtime = createRuntime();
  await runtime.dev.load(scenario);
  runtime.dev.setPromptMode(promptMode);
  permissionsStore.getState().patch({ ...emptyPermissions, ...permissions });
  rulesStore.getState().patch({ lockedApps: apps ? chosen : { handle: null, isEmpty: true } });
  if (!gyms) settingsStore.getState().patch({ gymPlaces: [] });
  const onDone = jest.fn(),
    onStep = jest.fn();
  const rendered = renderRouter({
    _layout: () => (
      <AppRuntimeProvider runtime={runtime}>
        <SetupFlow account={account} onDone={onDone} onStep={onStep} />
      </AppRuntimeProvider>
    ),
    index: () => null,
    'gym-picker': () => null,
  });
  await rendered;
  return { runtime, onDone, onStep, rendered };
}
const settle = () =>
  act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
const header = (name: string) => screen.getByRole('header', { name });

test('after the paywall a walking user signs in, then gets one screen per grant, in order', async () => {
  const { runtime, onDone } = await renderFlow('walk-state-ready', {}, { account: true });
  expect(header('Save your progress')).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Skip for now' }));

  expect(header('Choose apps to lock')).toBeTruthy();
  // The iOS alert is drawn where it will appear, and the line under the title names the choice to tap.
  expect(
    screen.getByText('“ExcerLock” Would Like to Access Screen Time', { includeHiddenElements: true }),
  ).toBeTruthy();
  expect(screen.getByText('Tap “Continue”')).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await settle();
  await act(async () => {
    runtime.dev.resolvePrompt(chosen);
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });

  expect(header('Count your steps')).toBeTruthy();
  expect(screen.getByText('Tap “OK”')).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await settle();

  expect(header('Unlock apps as you walk')).toBeTruthy();
  expect(screen.getByText('Tap “Allow While Using App”')).toBeTruthy();
  expect(
    screen.getByText(/keep walk detection and gym auto-detect running/, { includeHiddenElements: true }),
  ).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await settle();

  expect(permissionsStore.getState().data).toMatchObject({
    screenTime: 'granted',
    motion: 'granted',
    location: 'always',
  });
  expect(rulesStore.getState().data.lockedApps.isEmpty).toBe(false);
  expect(onDone).toHaveBeenCalledTimes(1);
  const resolved = runtime.dev
    .snapshot()
    .events.filter((e) => e.event === 'permission_resolved')
    .map((e) => e.props);
  expect(resolved).toEqual([
    { permission: 'screen_time', outcome: 'granted' },
    { permission: 'motion', outcome: 'granted' },
    { permission: 'location', outcome: 'granted' },
  ]);
  runtime.dispose();
});

test('a step goal asks only for what it needs', async () => {
  const { runtime, onDone } = await renderFlow('home-locked-walking', { screenTime: 'granted' }, { apps: true });
  expect(header('Count your steps')).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await settle();
  expect(onDone).toHaveBeenCalledTimes(1);
  runtime.dispose();
});

test('Not now moves on without asking, and the flow ends', async () => {
  const { runtime, onDone, onStep } = await renderFlow('walk-state-ready', {}, { account: true });
  await userEvent.press(screen.getByRole('button', { name: 'Skip for now' }));
  for (const title of ['Choose apps to lock', 'Count your steps', 'Unlock apps as you walk']) {
    expect(header(title)).toBeTruthy();
    await userEvent.press(screen.getByRole('button', { name: 'Not now' }));
  }
  expect(onDone).toHaveBeenCalledTimes(1);
  // Each screen is reported once, so analytics can show where people stop.
  expect(onStep.mock.calls.map(([step]) => step)).toEqual(['account', 'apps', 'motion', 'location']);
  expect(permissionsStore.getState().data).toMatchObject({ screenTime: 'notDetermined', motion: 'notDetermined' });
  runtime.dispose();
});

test('saying no to the iPhone moves on; Home asks again later', async () => {
  const { runtime, onDone } = await renderFlow(
    'home-locked-walking',
    { screenTime: 'granted' },
    { apps: true, promptMode: 'deny' },
  );
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await settle();
  expect(permissionsStore.getState().data.motion).toBe('denied');
  expect(onDone).toHaveBeenCalledTimes(1);
  runtime.dispose();
});

test('a grant refused earlier opens Settings, because iOS will not ask again', async () => {
  const { runtime } = await renderFlow(
    'home-locked-walking',
    { screenTime: 'granted', motion: 'denied' },
    { apps: true },
  );
  expect(header('Count your steps')).toBeTruthy();
  expect(screen.getByText('Motion & Fitness is off for ExcerLock. Turn it on in Settings.')).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Open Settings' }));
  expect(openSettings).toHaveBeenCalledTimes(1);
  runtime.dispose();
});

test('While Using that stays While Using hands off to Settings for Always', async () => {
  const { runtime, onDone } = await renderFlow(
    'walk-state-ready',
    { screenTime: 'granted', motion: 'granted', location: 'whenInUse' },
    { apps: true, promptMode: 'deny' },
  );
  expect(header('Unlock apps as you walk')).toBeTruthy();
  // From While Using, iOS asks with its one-time upgrade alert.
  expect(screen.getByText('Tap “Change to Always Allow”')).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await settle();
  expect(permissionsStore.getState().data.location).toBe('whenInUse');
  expect(onDone).not.toHaveBeenCalled();
  await userEvent.press(screen.getByRole('button', { name: 'Open Settings' }));
  expect(openSettings).toHaveBeenCalledTimes(1);
  runtime.dispose();
});

test('a gym user allows location, then picks a gym', async () => {
  const { runtime, rendered } = await renderFlow(
    'gym-arrival-user',
    { screenTime: 'granted' },
    { apps: true, gyms: false },
  );
  expect(header('Know when you are at the gym')).toBeTruthy();
  expect(screen.getByText('Allow While Using App', { includeHiddenElements: true })).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await settle();
  expect(permissionsStore.getState().data.location).toBe('whenInUse');
  expect(header('Pick your gym')).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Choose gym' }));
  expect(rendered.getPathname()).toBe('/gym-picker');
  runtime.dispose();
});
