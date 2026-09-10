import { userEvent, waitFor } from '@testing-library/react-native';
import { Slot } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { OnboardingRoute } from '../OnboardingRoute';
import { BootGate } from '../../launch/BootGate';
import { onboardingStore } from '../../../state/onboardingStore';
import { entitlementStore } from '../../../state/entitlementStore';
import { hydrateStores } from '../../../state/stores';
import { onboardingCopy } from '../../../content/onboarding';
import { preBranch, nextStep } from '../../../onboarding/flow';
import { createRuntime } from '../../../runtime/createRuntime';
import type { Runtime } from '../../../runtime/Runtime';
import { dayKey } from '../../../domain/calendar';
const answers = {
  name: 'Alex',
  referralSource: 'friend',
  ageBand: '25–34',
  improveFirst: 'exercise',
  mainReason: 'focus',
  estimatedDailyMinutes: 180,
  activity: 'walking',
  walkingMode: 'steps',
};
const routes = {
  _layout: () => (
    <AppRuntimeProvider>
      <Slot />
    </AppRuntimeProvider>
  ),
  index: BootGate,
  'onboarding/[step]': OnboardingRoute,
};
const routesWithRuntime = (runtime: Runtime) => ({
  ...routes,
  _layout: () => <AppRuntimeProvider runtime={runtime}><Slot /></AppRuntimeProvider>,
});
test.each(preBranch)('%s renders, advances, and returns through the actual router', async (step) => {
  await hydrateStores();
  onboardingStore.getState().reset();
  onboardingStore.getState().patch({ step, answers });
  entitlementStore.getState().reset();
  const routed = renderRouter(routes, { initialUrl: `/onboarding/${step}` });
  await routed;
  expect(screen.getByRole('header', { name: onboardingCopy[step].title })).toBeTruthy();
  await userEvent.press(
    screen.getByRole('button', { name: ['O01', 'O02', 'O03'].includes(step) ? 'Get started' : 'Continue' }),
  );
  expect(routed.getPathname()).toBe('/onboarding/' + nextStep({ step, answers }));
  await userEvent.press(screen.getByRole('button', { name: 'Back' }));
  expect(routed.getPathname()).toBe('/onboarding/' + step);
});
test.each(['O04', 'O05', 'O06', 'O08', 'O09', 'O20'])('%s blocks continuation without an answer', async (step) => {
  onboardingStore.getState().reset();
  const routed = renderRouter(routes, { initialUrl: `/onboarding/${step}` });
  await routed;
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
});
test('rehydration and remount resume the persisted step and answer', async () => {
  await hydrateStores();
  onboardingStore.getState().patch({ step: 'O06', answers });
  entitlementStore.getState().reset();
  await onboardingStore.persist.rehydrate();
  const routed = renderRouter(routes, { initialUrl: '/' });
  await routed;
  expect(routed.getPathname()).toBe('/onboarding/O06');
  expect(screen.getByRole('radio', { name: '25–34' })).toBeChecked();
});

test('exact reviewer name applies locally once without requesting or exposing the remote flag', async () => {
  onboardingStore.getState().reset();
  onboardingStore.getState().patch({ step: 'O04', answers: { name: '  App Review  ' } });
  const runtime = createRuntime('fake');
  const isEnabled = jest.fn(async () => true), expose = jest.fn();
  runtime.reviewPreset = { isEnabled, expose };
  const routed = renderRouter(routesWithRuntime(runtime), { initialUrl: '/onboarding/O04' });
  await routed;
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await waitFor(() => expect(routed.getPathname()).toBe('/onboarding/O05'));
  const persisted = onboardingStore.getState().data.answers;
  const weekday = new Date(`${dayKey(runtime.clock.now(), runtime.clock.timezone())}T12:00:00Z`).getUTCDay();
  expect(persisted).toEqual(expect.objectContaining({
    activity: 'walking', walkingMode: 'steps', stepGoal: 20, days: [weekday], allDay: true,
  }));
  expect(isEnabled).not.toHaveBeenCalled();
  expect(expose).not.toHaveBeenCalled();
});

test('remote reviewer assignment applies once and telemetry failure cannot block navigation', async () => {
  onboardingStore.getState().reset();
  onboardingStore.getState().patch({ step: 'O04', answers: { name: 'Reviewer' } });
  const runtime = createRuntime('fake');
  const isEnabled = jest.fn(async () => true), expose = jest.fn(() => { throw new Error('offline'); });
  runtime.reviewPreset = { isEnabled, expose };
  const routed = renderRouter(routesWithRuntime(runtime), { initialUrl: '/onboarding/O04' });
  await routed;
  const button = screen.getByRole('button', { name: 'Continue' });
  await userEvent.press(button);
  await waitFor(() => expect(routed.getPathname()).toBe('/onboarding/O05'));
  expect(onboardingStore.getState().data.answers.stepGoal).toBe(20);
  expect(isEnabled).toHaveBeenCalledTimes(1);
  expect(expose).toHaveBeenCalledTimes(1);
});
