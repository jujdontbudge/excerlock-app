import { act, userEvent } from '@testing-library/react-native';
import { Slot } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { FakePromptHost } from '../../permissions/FakePromptHost';
import { OnboardingRoute } from '../../onboarding/OnboardingRoute';
import { onboardingStore } from '../../../state/onboardingStore';
import { permissionsStore } from '../../../state/permissionsStore';

async function openReminder(mode: 'grant' | 'deny') {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  runtime.dev.setPromptMode(mode);
  onboardingStore.getState().reset();
  onboardingStore.getState().patch({ answers: { activity: 'walking', walkingMode: 'steps', name: 'Alex', stepGoal: 5000 } });
  const route = renderRouter(
    {
      _layout: () => (
        <AppRuntimeProvider runtime={runtime}>
          <Slot />
          <FakePromptHost />
        </AppRuntimeProvider>
      ),
      'onboarding/[step]': OnboardingRoute,
      paywall: () => null,
    },
    { initialUrl: '/onboarding/S3d' },
  );
  await route;
  return { route };
}

test.each(['grant', 'deny'] as const)('Continue on the trial reminder asks for notifications (%s) and moves on', async (mode) => {
  const { route } = await openReminder(mode);
  expect(permissionsStore.getState().data.notifications).toBe('notDetermined');
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await act(async () => {});
  expect(permissionsStore.getState().data.notifications).toBe(mode === 'grant' ? 'granted' : 'denied');
  expect(route.getPathname()).toBe('/paywall');
});
