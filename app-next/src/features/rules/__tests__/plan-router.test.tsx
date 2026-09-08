import { userEvent, fireEvent } from '@testing-library/react-native';
import { Slot } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { OnboardingRoute } from '../../onboarding/OnboardingRoute';
import { onboardingStore } from '../../../state/onboardingStore';
import { rulesStore } from '../../../state/rulesStore';
import { profileStore } from '../../../state/profileStore';
const routes = {
  _layout: () => (
    <AppRuntimeProvider>
      <Slot />
    </AppRuntimeProvider>
  ),
  'onboarding/[step]': OnboardingRoute,
};
beforeEach(() => {
  onboardingStore.getState().reset();
  rulesStore.getState().reset();
  profileStore.getState().reset();
  onboardingStore
    .getState()
    .patch({ answers: { activity: 'walking', walkingMode: 'steps', name: 'Alex', stepGoal: 5000 } });
});
test.each([
  ['Edit goal', 'W3'],
  ['Edit place', 'W1'],
  ['Edit schedule', 'S1'],
])('%s returns directly to the summary', async (label, step) => {
  const route = renderRouter(routes, { initialUrl: '/onboarding/S3' });
  await route;
  await userEvent.press(screen.getByRole('button', { name: label }));
  expect(route.getPathname()).toBe('/onboarding/' + step);
  if (step === 'W3') await userEvent.press(screen.getByRole('button', { name: 'Add 500 steps' }));
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(route.getPathname()).toBe('/onboarding/S3');
  expect(onboardingStore.getState().data.answers.name).toBe('Alex');
  await userEvent.press(screen.getByRole('button', { name: 'Use this plan' }));
  expect(route.getPathname()).toBe('/onboarding/S4');
  expect(rulesStore.getState().data.rules).toHaveLength(1);
});
test.each(['Continue', 'Not now'])('warm-up %s advances without a native review request', async (label) => {
  const route = renderRouter(routes, { initialUrl: '/onboarding/S4' });
  await route;
  if (label === 'Continue') {
    await userEvent.press(screen.getByRole('radio', { name: '4 stars' }));
    expect(profileStore.getState().data.warmupRating).toBe(4);
  }
  await userEvent.press(screen.getByRole('button', { name: label }));
  expect(route.getPathname()).toBe('/onboarding/T1');
});

test('all-day switch persists and enables an otherwise invalid window', async () => {
  onboardingStore.getState().patch({ answers: { activity: 'walking', startMinute: 1260, endMinute: 1260 } });
  const route = renderRouter(routes, { initialUrl: '/onboarding/S1' });
  await route;
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  await fireEvent(screen.getByRole('switch', { name: 'All day' }), 'valueChange', true);
  expect(onboardingStore.getState().data.answers.allDay).toBe(true);
  expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
});
