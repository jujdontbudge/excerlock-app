import { act, screen, userEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { renderRouter } from 'expo-router/testing-library';
import { HomeScreen } from '../HomeScreen';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { permissionsStore } from '../../../state/permissionsStore';
import type { Permissions } from '../../../domain/types';

jest.mock('../../../motion/haptics', () => ({ feedback: jest.fn() }));
const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
beforeEach(() => openSettings.mockClear());

const TURN_ON = 'Turn on background walking', OPEN_SETTINGS = 'Open Settings';

async function renderHome(permissions: Partial<Permissions>, promptMode: 'grant' | 'deny' = 'grant') {
  const runtime = createRuntime();
  await runtime.dev.load('walk-state-ready');
  runtime.dev.setPromptMode(promptMode);
  permissionsStore.getState().patch(permissions);
  const rendered = await renderRouter({
    _layout: () => <AppRuntimeProvider runtime={runtime}><HomeScreen /></AppRuntimeProvider>,
    index: () => null,
  });
  return { runtime, done: async () => { await rendered.unmount(); runtime.dispose(); } };
}
const settle = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

test('walking card asks for motion and Always location, then arms background walking', async () => {
  const { runtime, done } = await renderHome({ motion: 'notDetermined', location: 'notDetermined' });
  expect(screen.getByText(/while ExcerLock is closed/)).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: TURN_ON }));
  await settle();
  expect(permissionsStore.getState().data).toMatchObject({ motion: 'granted', location: 'always' });
  expect(screen.queryByRole('button', { name: TURN_ON })).toBeNull();
  expect(screen.getByRole('button', { name: 'Check walking' })).toBeTruthy();
  const resolved = runtime.dev.snapshot().events.filter((e) => e.event === 'permission_resolved').map((e) => e.props);
  expect(resolved).toEqual([
    { permission: 'motion', outcome: 'granted' },
    { permission: 'location', outcome: 'granted' },
  ]);
  await done();
});

test('walking card is quiet once motion and Always location are granted', async () => {
  const { runtime, done } = await renderHome({ motion: 'granted', location: 'always' });
  expect(screen.queryByRole('button', { name: TURN_ON })).toBeNull();
  expect(screen.queryByRole('button', { name: OPEN_SETTINGS })).toBeNull();
  expect(screen.queryByText(/while ExcerLock is closed/)).toBeNull();
  await done();
});

test('a While Using grant that stays While Using hands off to Settings', async () => {
  const { runtime, done } = await renderHome({ motion: 'granted', location: 'whenInUse' }, 'deny');
  await userEvent.press(screen.getByRole('button', { name: TURN_ON }));
  await settle();
  expect(permissionsStore.getState().data.location).toBe('whenInUse');
  expect(screen.queryByRole('button', { name: TURN_ON })).toBeNull();
  await userEvent.press(screen.getByRole('button', { name: OPEN_SETTINGS }));
  expect(openSettings).toHaveBeenCalledTimes(1);
  const resolved = runtime.dev.snapshot().events.filter((e) => e.event === 'permission_resolved').map((e) => e.props);
  expect(resolved).toEqual([{ permission: 'location', outcome: 'denied' }]);
  await done();
});

test('a denied grant sends the user to Settings instead of prompting again', async () => {
  const { runtime, done } = await renderHome({ motion: 'granted', location: 'denied' });
  expect(screen.queryByRole('button', { name: TURN_ON })).toBeNull();
  await userEvent.press(screen.getByRole('button', { name: OPEN_SETTINGS }));
  expect(openSettings).toHaveBeenCalledTimes(1);
  await done();
});
