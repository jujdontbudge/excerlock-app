import { Slot } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import { act, userEvent, waitFor } from '@testing-library/react-native';
import { createRuntime } from '../../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { Runtime } from '../../../runtime/Runtime';
import { HomeScreen } from '../HomeScreen';
import { statusContent } from '../statusContent';
import { enforcementStore } from '../../../state/enforcementStore';
import { rulesStore } from '../../../state/rulesStore';
import { permissionsStore } from '../../../state/permissionsStore';
import { resolveLock } from '../../../domain/resolveLock';
import { homeCopy as c } from '../../../content/home';

beforeEach(() => enforcementStore.setState({ enforcementStatus: null, lastClaimAt: null }));

async function home(scenario: string, prepare: (runtime: Runtime) => void = () => undefined) {
  const runtime = createRuntime();
  await runtime.dev.load(scenario);
  prepare(runtime);
  const rendered = await renderRouter(
    {
      _layout: () => (
        <AppRuntimeProvider runtime={runtime}>
          <Slot />
        </AppRuntimeProvider>
      ),
      home: HomeScreen,
    },
    { initialUrl: '/home' },
  );
  return { runtime, rendered };
}

test("Home says 'Blocking is not on' with a Try again action after a failed apply", async () => {
  const { runtime, rendered } = await home('home-locked-walking', (r) => r.dev.setOutcome('error'));

  await waitFor(() => expect(enforcementStore.getState().enforcementStatus?.applied).toBe(false));

  expect(await screen.findByText(c.enforcementFailed)).toBeTruthy();
  expect(screen.getByText(c.enforcementFailedBody)).toBeTruthy();
  expect(screen.getByRole('button', { name: c.tryAgain })).toBeTruthy();
  await rendered.unmount();
  runtime.dispose();
});

test('the failed apply still leaves the shields up', async () => {
  const { runtime, rendered } = await home('home-locked-walking', (r) => r.dev.setOutcome('error'));

  await waitFor(() => expect(enforcementStore.getState().enforcementStatus?.applied).toBe(false));

  expect(enforcementStore.getState().enforcementStatus?.shields).toBe('up');
  await rendered.unmount();
  runtime.dispose();
});

test('Try again asks the host to re-apply the lock', async () => {
  const { runtime, rendered } = await home('home-locked-walking', (r) => r.dev.setOutcome('error'));
  await waitFor(() => expect(enforcementStore.getState().enforcementStatus?.applied).toBe(false));
  await act(async () => runtime.dev.setOutcome('success'));

  await userEvent.press(screen.getByRole('button', { name: c.tryAgain }));

  await waitFor(() => expect(enforcementStore.getState().enforcementStatus?.applied).toBe(true));
  expect(screen.queryByText(c.enforcementFailed)).toBeNull();
  await rendered.unmount();
  runtime.dispose();
});

test('a successful apply leaves the ordinary status alone', () => {
  const decision = resolveLock({
    now: '2026-09-07T15:00:00.000Z',
    timezone: 'America/New_York',
    rules: [],
    ruleDays: [],
    earnedUnlocks: [],
    walkingSession: null,
    gymPresence: null,
  });
  const model = statusContent({
    decision,
    rules: rulesStore.getState().data.rules,
    permissions: permissionsStore.getState().data,
    apps: rulesStore.getState().data.lockedApps,
    now: '2026-09-07T15:00:00.000Z',
    timezone: 'America/New_York',
    enforcement: { applied: true },
  });
  expect(model.state).not.toBe('enforcementFailed');
});
