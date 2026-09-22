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
  ['G1', 'Be at the gym', 'When should blocking be active?'],
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
  ['W2', 'Reach a step goal', 'Set your walking goal'],
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
    await userEvent.press(screen.getByRole(step === 'W1' ? 'checkbox' : 'radio', { name: choice }));
    await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('header', { name: title })).toBeTruthy();
    const answers = onboardingStore.getState().data.answers;
    await act(() => {
      expect(validateRule(commitPlan(answers, 'mi'))).toEqual([]);
    });
  },
);
test.each(['W1', 'W2', 'W3'] as const)('%s previews the reviewer preset schedule', async (step) => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  onboardingStore.getState().reset();
  onboardingStore.getState().patch({
    answers: { activity: 'walking', walkingMode: 'steps', stepGoal: 20, days: [2], allDay: true },
  });
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
  expect(screen.getByRole('header', { name: /all day on Tue/ })).toBeTruthy();
  expect(screen.getByText('12 AM')).toBeTruthy();
  expect(screen.getByText('11:59 PM')).toBeTruthy();
});
test('activity defaults stay separate when answers switch between walking and gym', () => {
  const walking = draftFromAnswers({ activity: 'walking', stepGoal: '8000' });
  expect(walking.stepGoal).toBe(8000);
  const gym = draftFromAnswers({ activity: 'gym' });
  expect(gym.gymMode).toBe('arrival');
  expect(draftFromAnswers({ activity: 'gym', gymMode: 'presence' }).gymMode).toBe('presence');
  const switched = draftFromAnswers({ activity: 'gym' }, walking);
  expect(switched.activity).toBe('gym');
  expect(switched.gymMinutes).toBe(30);
});
test('canceling an invalid step-goal edit restores the valid summary', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('fresh-install');
  const saved = { activity: 'walking', walkPlace: 'outside', walkingMode: 'steps', stepGoal: '5000' };
  onboardingStore.getState().patch({
    answers: { ...saved, returnTo: 'S3', editBackup: JSON.stringify(saved) },
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
    { initialUrl: '/onboarding/W3?returnTo=S3' },
  );
  await r;
  await fireEvent.changeText(screen.getByLabelText('Daily step goal'), '');
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  await userEvent.press(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByRole('header', { name: 'Your plan is ready' })).toBeTruthy();
  expect(screen.getByText(/Your apps are blocked until you walk 5,000 steps/)).toBeTruthy();
  expect(onboardingStore.getState().data.answers.stepGoal).toBe('5000');
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
