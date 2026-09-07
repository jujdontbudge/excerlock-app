import { userEvent } from '@testing-library/react-native';
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
const answers = {
  name: 'Alex',
  referralSource: 'friend',
  ageBand: '25–34',
  occupation: 'Remote worker',
  improveFirst: 'exercise',
  mainReason: 'focus',
  estimatedDailyMinutes: 180,
  activity: 'walking',
  walkingMode: 'target',
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
test.each(['O04', 'O05', 'O06', 'O07', 'O08', 'O09', 'O20'])(
  '%s blocks continuation without an answer',
  async (step) => {
    onboardingStore.getState().reset();
    const routed = renderRouter(routes, { initialUrl: `/onboarding/${step}` });
    await routed;
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  },
);
test('rehydration and remount resume the persisted step and answer', async () => {
  await hydrateStores();
  onboardingStore.getState().patch({ step: 'O07', answers });
  entitlementStore.getState().reset();
  await onboardingStore.persist.rehydrate();
  const routed = renderRouter(routes, { initialUrl: '/' });
  await routed;
  expect(routed.getPathname()).toBe('/onboarding/O07');
  expect(screen.getByRole('radio', { name: 'Remote worker' })).toBeChecked();
});
