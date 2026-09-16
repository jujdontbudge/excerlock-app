import { userEvent, fireEvent } from '@testing-library/react-native';
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
  ['Unlock while walking (Recommended)', 'S1'],
  ['Reach a step goal', 'W3'],
])('%s follows the correct branch', async (label, next) => {
  onboardingStore.getState().reset();
  onboardingStore.getState().patch({ step: 'W1', answers: { activity: 'walking' } });
  const route = renderRouter(routes, { initialUrl: '/onboarding/W1' });
  await route;
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await userEvent.press(screen.getByRole('radio', { name: label }));
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(route.getPathname()).toBe('/onboarding/' + next);
  if (next === 'W3') {
    fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(route.getPathname()).toBe('/onboarding/S1');
    expect(onboardingStore.getState().data.answers.stepGoal).toBe('10500');
  }
});
