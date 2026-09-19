import { userEvent, fireEvent } from '@testing-library/react-native';
import { Slot } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { OnboardingRoute } from '../../onboarding/OnboardingRoute';
import { onboardingStore } from '../../../state/onboardingStore';
import { rulesStore } from '../../../state/rulesStore';
import { profileStore } from '../../../state/profileStore';
import { createRuntime } from '../../../runtime/createRuntime';
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
  ['goal', 'W3'],
  ['schedule', 'S1'],
])('%s edit route still returns directly to the simplified summary', async (_label, step) => {
  const route = renderRouter(routes, { initialUrl: `/onboarding/${step}?returnTo=S3` });
  await route;
  expect(route.getPathname()).toBe('/onboarding/' + step);
  if (step === 'W3')
    fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(route.getPathname()).toBe('/onboarding/S3');
  expect(onboardingStore.getState().data.answers.name).toBe('Alex');
  await userEvent.press(screen.getByRole('button', { name: 'Use this plan' }));
  expect(route.getPathname()).toBe('/onboarding/S3b');
  expect(screen.getByRole('header', { name: 'How your plan works' })).toBeTruthy();
  const committed = rulesStore.getState().data.rules;
  expect(committed).toHaveLength(1);
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(route.getPathname()).toBe('/onboarding/S4');
  expect(rulesStore.getState().data.rules).toEqual(committed);
  await userEvent.press(screen.getByRole('button', { name: 'Back' }));
  expect(route.getPathname()).toBe('/onboarding/S3b');
  await userEvent.press(screen.getByRole('button', { name: 'Back' }));
  expect(route.getPathname()).toBe('/onboarding/S3');
});
test('demo view reports selected scenario and treadmill preference without a second plan commit', async () => {
  onboardingStore.getState().patch({ answers: { activity: 'walking', walkingMode: 'state' } });
  profileStore.getState().patch({ walkPlaces: ['treadmill'] });
  const runtime = createRuntime('fake');
  const track = jest.spyOn(runtime.analytics, 'track');
  const route = renderRouter({ ...routes, _layout: () => <AppRuntimeProvider runtime={runtime}><Slot /></AppRuntimeProvider> }, { initialUrl: '/onboarding/S3b' });
  await route;
  expect(track).toHaveBeenCalledWith('onboarding_screen_viewed', { screen: 'S3b', scenario: 'walk-state', place: 'treadmill' });
  expect(screen.getByRole('header', { name: 'How your plan works' })).toBeTruthy();
  expect(rulesStore.getState().data.rules).toEqual([]);
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
