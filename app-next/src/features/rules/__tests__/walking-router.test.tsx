import { userEvent } from '@testing-library/react-native';
import { Slot } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { OnboardingRoute } from '../../onboarding/OnboardingRoute';
import { onboardingStore } from '../../../state/onboardingStore';
const routes = {
  _layout: () => (
    <AppRuntimeProvider>
      <Slot />
    </AppRuntimeProvider>
  ),
  'onboarding/[step]': OnboardingRoute,
};
test.each([
  ['Unlock while walking', 'S1'],
  ['Reach a step goal', 'W3'],
])('%s follows the correct branch', async (label, next) => {
  onboardingStore.getState().reset();
  onboardingStore.getState().patch({ step: 'W1', answers: { activity: 'walking' } });
  const route = renderRouter(routes, { initialUrl: '/onboarding/W1' });
  await route;
  await userEvent.press(screen.getByRole('radio', { name: 'Either' }));
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await userEvent.press(screen.getByRole('radio', { name: label }));
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(route.getPathname()).toBe('/onboarding/' + next);
  expect(onboardingStore.getState().data.answers.walkPlace).toBe('either');
  if (next === 'W3') {
    await userEvent.press(screen.getByRole('button', { name: 'Add 500 steps' }));
    await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(route.getPathname()).toBe('/onboarding/S1');
    expect(onboardingStore.getState().data.answers.stepGoal).toBe('5500');
  }
});
test('Walk for a set time follows the duration branch', async () => {
  onboardingStore.getState().reset();
  onboardingStore.getState().patch({ step: 'W1', answers: { activity: 'walking' } });
  const route = renderRouter(routes, { initialUrl: '/onboarding/W1' });
  await route;
  await userEvent.press(screen.getByRole('radio', { name: 'Either' }));
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await userEvent.press(screen.getByRole('radio', { name: 'Walk for a set time' }));
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(route.getPathname()).toBe('/onboarding/W4');
  await userEvent.press(screen.getByRole('button', { name: '30 minutes' }));
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(route.getPathname()).toBe('/onboarding/S1');
  expect(onboardingStore.getState().data.answers.walkMinutes).toBe('30');
});
test('going back to W1 and choosing Treadmill drops the step goal branch', async () => {
  onboardingStore.getState().reset();
  onboardingStore.getState().patch({ step: 'W1', answers: { activity: 'walking' } });
  const route = renderRouter(routes, { initialUrl: '/onboarding/W1' });
  await route;
  await userEvent.press(screen.getByRole('radio', { name: 'Outside' }));
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await userEvent.press(screen.getByRole('radio', { name: 'Reach a step goal' }));
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(route.getPathname()).toBe('/onboarding/W3');
  await userEvent.press(screen.getByRole('button', { name: 'Back' }));
  await userEvent.press(screen.getByRole('button', { name: 'Back' }));
  expect(route.getPathname()).toBe('/onboarding/W1');
  await userEvent.press(screen.getByRole('radio', { name: 'Treadmill' }));
  expect(onboardingStore.getState().data.answers.walkingMode).toBe('minutes');
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.queryByRole('radio', { name: 'Reach a step goal' })).toBeNull();
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(route.getPathname()).toBe('/onboarding/W4');
});
