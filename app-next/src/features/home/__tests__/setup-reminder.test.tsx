import { screen, userEvent } from '@testing-library/react-native';
import { Slot } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { HomeScreen } from '../HomeScreen';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { emptyPermissions, permissionsStore } from '../../../state/permissionsStore';
import { rulesStore } from '../../../state/rulesStore';
import { settingsStore } from '../../../state/settingsStore';
import type { Permissions } from '../../../domain/types';

jest.mock('../../../motion/haptics', () => ({ feedback: jest.fn() }));

const ready: Permissions = { ...emptyPermissions, screenTime: 'granted', motion: 'granted', location: 'always' };
async function renderHome(scenario: string, permissions: Partial<Permissions>, { apps = true, gyms = true } = {}) {
  const runtime = createRuntime();
  await runtime.dev.load(scenario);
  permissionsStore.getState().patch({ ...ready, ...permissions });
  rulesStore.getState().patch({ lockedApps: { handle: null, isEmpty: !apps } });
  if (!gyms) settingsStore.getState().patch({ gymPlaces: [] });
  const rendered = renderRouter({
    _layout: () => (
      <AppRuntimeProvider runtime={runtime}>
        <Slot />
      </AppRuntimeProvider>
    ),
    index: HomeScreen,
    'permissions/[step]': () => null,
  });
  await rendered;
  return { runtime, rendered };
}

test.each([
  ['walk-state-ready', { screenTime: 'notDetermined' }, {}, 'Your apps are not locked yet', 'Choose apps', 'apps'],
  ['walk-state-ready', {}, { apps: false }, 'Your apps are not locked yet', 'Choose apps', 'apps'],
  ['walk-state-ready', { motion: 'denied' }, {}, 'Your steps are not counting yet', 'Turn on', 'motion'],
  ['walk-state-ready', { location: 'whenInUse' }, {}, 'Walks cannot open your apps yet', 'Turn on', 'location'],
  ['gym-arrival-user', { location: 'notDetermined' }, {}, 'Gym visits cannot count yet', 'Turn on', 'location'],
  ['gym-arrival-user', {}, { gyms: false }, 'Pick your gym so visits count', 'Choose gym', 'gym'],
] as const)('%s missing %j %j shows one card that opens the fix', async (scenario, permissions, options, title, action, step) => {
  const { runtime, rendered } = await renderHome(scenario, permissions, options);
  expect(screen.getByText(title)).toBeTruthy();
  expect(screen.getByText('ExcerLock needs this to work.')).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: action }));
  expect(rendered.getPathname()).toBe(`/permissions/${step}`);
  runtime.dispose();
});

test('with everything on, Home shows no reminder and no background-walking button', async () => {
  const { runtime } = await renderHome('walk-state-ready', {});
  expect(screen.queryByText('ExcerLock needs this to work.')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Turn on background walking' })).toBeNull();
  runtime.dispose();
});

test('the walking card leaves the asking to the one reminder card', async () => {
  const { runtime } = await renderHome('walk-state-ready', { motion: 'notDetermined', location: 'notDetermined' });
  expect(screen.getByText('Your steps are not counting yet')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Turn on background walking' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Check walking' })).toBeTruthy();
  runtime.dispose();
});
