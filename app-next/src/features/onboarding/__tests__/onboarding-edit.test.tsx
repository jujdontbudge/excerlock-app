import { userEvent } from '@testing-library/react-native';
import { Slot } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { OnboardingRoute } from '../OnboardingRoute';
import { onboardingStore } from '../../../state/onboardingStore';
import { hydrateStores } from '../../../state/stores';
import { planCopy } from '../../../content/plan';
const answers = {
  name: 'Alex',
  referralSource: 'friend',
  ageBand: '25–34',
  occupation: 'Remote worker',
  improveFirst: 'exercise',
  mainReason: 'focus',
  estimatedDailyMinutes: 180,
  activity: 'walking',
  place: 'outside',
  walkingMode: 'target',
  stepGoal: 5000,
  days: [1, 2, 3, 4, 5],
  allDay: false,
  startMinute: 540,
  endMinute: 1260,
};
const routes = {
  _layout: () => (
    <AppRuntimeProvider>
      <Slot />
    </AppRuntimeProvider>
  ),
  'onboarding/[step]': OnboardingRoute,
};
async function openSummary(extra: Record<string, unknown> = {}) {
  await hydrateStores();
  onboardingStore.getState().reset();
  onboardingStore.getState().patch({ step: 'S3', answers: { ...answers, ...extra } });
  const routed = renderRouter(routes, { initialUrl: '/onboarding/S3' });
  await routed;
  return routed;
}
test('pressing Back after an S3 edit restores the pre-edit answers for a four-branch answer set', async () => {
  const wide = {
    stepGoal: 7500,
    gymMinutes: 45,
    minutes: 25,
    distance: 6,
    runMode: 'distance',
    gymMode: 'time',
    filler: 'x'.repeat(480),
  };
  await openSummary(wide);
  await userEvent.press(screen.getByRole('button', { name: planCopy.editGoal }));
  await userEvent.press(screen.getByRole('radio', { name: 'Unlock while walking' }));
  await userEvent.press(screen.getByRole('button', { name: 'Back' }));
  expect(onboardingStore.getState().data.answers.walkingMode).toBe('target');
  expect(onboardingStore.getState().data.answers.stepGoal).toBe(7500);
  expect(onboardingStore.getState().data.answers.editBackup).toBeUndefined();
});
test('the edit snapshot never enters the validated answers map', async () => {
  await openSummary();
  await userEvent.press(screen.getByRole('button', { name: planCopy.editGoal }));
  expect(onboardingStore.getState().data.answers.editBackup).toBeUndefined();
  expect(String(onboardingStore.getState().data.answers.returnTo)).toBe('S3');
});
test('back() keeps the user on the edit step with an inline message when no snapshot was stored', async () => {
  await openSummary({ returnTo: 'S3' });
  const routed = renderRouter(routes, { initialUrl: '/onboarding/W2' });
  await routed;
  await userEvent.press(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByText(planCopy.restoreFailed)).toBeTruthy();
  expect(routed.getPathname()).toBe('/onboarding/W2');
});
test('advancing from an edit clears returnTo and the stored snapshot', async () => {
  await openSummary();
  await userEvent.press(screen.getByRole('button', { name: planCopy.editGoal }));
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(String(onboardingStore.getState().data.answers.returnTo || '')).toBe('');
  expect(onboardingStore.getState().data.answers.editBackup).toBeUndefined();
});
