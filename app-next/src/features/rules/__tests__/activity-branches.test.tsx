import { Slot, Stack, router } from 'expo-router';
import { Text } from 'react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { userEvent, fireEvent, act } from '@testing-library/react-native';
import { OnboardingRoute } from '../../onboarding/OnboardingRoute';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { onboardingStore } from '../../../state/onboardingStore';
import { commitPlan, draftFromAnswers } from '../plan';
import { validateRule } from '../../../domain/validateRule';
const paths = [
  ['gym', 'G1', 'Spend time at the gym', 'How long at the gym unlocks your phone?'],
  ['gym', 'G1', 'Arrive at the gym', 'When should blocking be active?'],
  ['running', 'R1', 'Run for a set time', 'Set your running goal'],
  ['running', 'R1', 'Run a set distance', 'Choose your distance'],
  ['biking', 'B1', 'Bike for a set time', 'Set your biking goal'],
  ['biking', 'B1', 'Bike a set distance', 'Choose your distance'],
] as const;
test.each(paths)(
  '%s through %s / %s reaches the correct goal and a valid rule',
  async (activity, step, choice, title) => {
    const runtime = createRuntime();
    await runtime.dev.load('fresh-install');
    onboardingStore.getState().patch({ answers: { activity } });
    const r = renderRouter(
      {
        _layout: () => (
          <AppRuntimeProvider runtime={runtime}>
            <Slot />
          </AppRuntimeProvider>
        ),
        'onboarding/[step]': OnboardingRoute,
        paywall: () => <Text>Paywall</Text>,
      },
      { initialUrl: '/onboarding/' + step },
    );
    await r;
    expect(screen.queryByText('Recommended')).toBeNull();
    expect(screen.queryByText("You'll pick your gym after setup.")).toBeNull();
    expect(screen.queryByText('Unlocks your apps for the rest of the day')).toBeNull();
    expect(screen.queryByRole('header', { name: /Block from/ })).toBeNull();
    await userEvent.press(screen.getByRole('radio', { name: choice }));
    await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('header', { name: title })).toBeTruthy();
    const answers = onboardingStore.getState().data.answers;
    await act(() => {
      expect(validateRule(commitPlan(answers, 'mi'))).toEqual([]);
    });
  },
);
test('activity defaults stay separate and distance unit changes do not convert the number', () => {
  const running = draftFromAnswers({ activity: 'running', runDistance: 2, runUnit: 'km' }, 'mi');
  expect(running.distance).toBe(2);
  expect(running.unit).toBe('km');
  const biking = draftFromAnswers({ activity: 'biking', runMinutes: 25, runDistance: 2 }, 'mi');
  expect(biking.minutes).toBe(30);
  expect(biking.distance).toBe(5);
});
test('canceling an invalid distance edit restores the valid summary', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  onboardingStore
    .getState()
    .patch({ answers: { activity: 'running', runMode: 'distance', runDistance: 2, runUnit: 'mi' } });
  const r = renderRouter(
    {
      _layout: () => (
        <AppRuntimeProvider runtime={runtime}>
          <Slot />
        </AppRuntimeProvider>
      ),
      'onboarding/[step]': OnboardingRoute,
    },
    { initialUrl: '/onboarding/S3' },
  );
  await r;
  await userEvent.press(screen.getByRole('button', { name: 'Edit goal' }));
  await fireEvent.changeText(screen.getByLabelText('Distance'), '');
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  await userEvent.press(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByRole('header', { name: 'Your plan is ready' })).toBeTruthy();
  expect(screen.getByText('Run 2 mi')).toBeTruthy();
});
test('a retained summary route does not validate the active route’s incomplete input', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  onboardingStore.getState().patch({ answers: { activity: 'running', runMode: 'distance', runDistance: 2 } });
  const r = renderRouter(
    {
      _layout: () => (
        <AppRuntimeProvider runtime={runtime}>
          <Stack screenOptions={{ animation: 'none' }} />
        </AppRuntimeProvider>
      ),
      'onboarding/[step]': OnboardingRoute,
    },
    { initialUrl: '/onboarding/S3' },
  );
  await r;
  await act(() => router.push('/onboarding/D'));
  await fireEvent.changeText(screen.getByLabelText('Distance'), '');
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
});
