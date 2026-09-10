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
const gymPaths = [
  ['G1', 'Spend time at the gym', 'How long at the gym unlocks your phone?'],
  ['G1', 'Arrive at the gym', 'When should blocking be active?'],
] as const;
test.each(gymPaths)(
  'gym through %s / %s reaches the correct goal and a valid rule',
  async (step, choice, title) => {
    const runtime = createRuntime();
    await runtime.dev.load('fresh-install');
    onboardingStore.getState().patch({ answers: { activity: 'gym' } });
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
const walkingPaths = [
  ['W1', 'Outside', 'How should walking unlock your apps?'],
  ['W2', 'Reach a step goal (Recommended)', 'Set your walking goal'],
] as const;
test.each(walkingPaths)(
  'walking through %s / %s reaches the correct goal and a valid rule',
  async (step, choice, title) => {
    const runtime = createRuntime();
    await runtime.dev.load('fresh-install');
    onboardingStore.getState().patch({ answers: { activity: 'walking' } });
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
    expect(screen.queryByText("You'll pick your gym after setup.")).toBeNull();
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
test('activity defaults stay separate when answers switch between walking and gym', () => {
  const walking = draftFromAnswers({ activity: 'walking', stepGoal: '8000' });
  expect(walking.stepGoal).toBe(8000);
  const gym = draftFromAnswers({ activity: 'gym', gymMode: 'arrival' });
  expect(gym.gymMode).toBe('arrival');
  const switched = draftFromAnswers({ activity: 'gym' }, walking);
  expect(switched.activity).toBe('gym');
  expect(switched.gymMinutes).toBe(30);
});
test('canceling an invalid step-goal edit restores the valid summary', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  onboardingStore.getState().patch({
    answers: { activity: 'walking', walkPlace: 'outside', walkingMode: 'steps', stepGoal: '5000' },
  });
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
  await fireEvent.changeText(screen.getByLabelText('Daily step goal'), '');
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  await userEvent.press(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByRole('header', { name: 'Your plan is ready' })).toBeTruthy();
  expect(screen.getByText('Walk 5,000 steps')).toBeTruthy();
});
test('a retained summary route does not validate the active route’s incomplete input', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  onboardingStore.getState().patch({
    answers: { activity: 'walking', walkPlace: 'outside', walkingMode: 'steps', stepGoal: '5000' },
  });
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
  await act(() => router.push('/onboarding/W3'));
  await fireEvent.changeText(screen.getByLabelText('Daily step goal'), '');
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
});
