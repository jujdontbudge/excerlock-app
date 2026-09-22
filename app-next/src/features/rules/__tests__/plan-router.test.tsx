import { userEvent, fireEvent, waitFor } from '@testing-library/react-native';
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
  expect(screen.getByText(/^Once you hit [\d,]+ steps, your apps will unlock\.$/)).toBeTruthy();
  expect(rulesStore.getState().data.rules).toHaveLength(1);
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
  expect(track).toHaveBeenCalledWith('onboarding_screen_viewed', { screen: 'plan-demo', scenario: 'walk-state', place: 'treadmill' });
  expect(screen.getByText('Once you start walking, your apps will unlock.')).toBeTruthy();
  expect(rulesStore.getState().data.rules).toEqual([]);
});
test('plan completion skips the rejected custom rating screen and continues to trial onboarding', async () => {
  const route = renderRouter(routes, { initialUrl: '/onboarding/S3' });
  await route;
  await userEvent.press(screen.getByRole('button', { name: 'Use this plan' }));
  expect(route.getPathname()).toBe('/onboarding/S3b');
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(route.getPathname()).toBe('/onboarding/S3c');
  await userEvent.press(screen.getByRole('button', { name: 'Next' }));
  expect(route.getPathname()).toBe('/onboarding/T1');
  expect(screen.queryByText('How does your plan feel so far?')).toBeNull();
});

test('schedule dial persists an adjusted endpoint and enables an invalid window', async () => {
  onboardingStore.getState().patch({ answers: { activity: 'walking', startMinute: 1260, endMinute: 1274 } });
  const route = renderRouter(routes, { initialUrl: '/onboarding/S1' });
  await route;
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  fireEvent(screen.getByRole('adjustable', { name: 'Blocking end time' }), 'accessibilityAction', {
    nativeEvent: { actionName: 'increment' },
  });
  expect(onboardingStore.getState().data.answers.endMinute).toBe(1275);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled());
});
