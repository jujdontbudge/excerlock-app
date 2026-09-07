import { render, screen, userEvent } from '@testing-library/react-native';
import { OnboardingRoute } from '../OnboardingRoute';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { onboardingStore } from '../../../state/onboardingStore';
const mockParams = { step: 'O01' };
const mockSetParams = jest.fn();
jest.mock('expo-router', () => ({
  useIsFocused: () => true,
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ setParams: mockSetParams, replace: jest.fn() }),
}));
test('intro shows its exercise-first promise and advances on the pinned CTA', async () => {
  onboardingStore.getState().reset();
  await render(
    <AppRuntimeProvider>
      <OnboardingRoute />
    </AppRuntimeProvider>,
  );
  expect(screen.getByRole('header', { name: 'Block apps. Exercise more.' })).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Get started' }));
  expect(mockSetParams).toHaveBeenCalledWith({ step: 'O02' });
  expect(onboardingStore.getState().data.step).toBe('O02');
});
test('welcome offers local sign-in and legal reading without advancing the onboarding draft', async () => {
  onboardingStore.getState().reset();
  await render(
    <AppRuntimeProvider>
      <OnboardingRoute />
    </AppRuntimeProvider>,
  );
  expect(screen.queryByLabelText('Setup progress')).toBeNull();
  expect(screen.getByLabelText('Introduction, page 1 of 3')).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  expect(screen.getByRole('button', { name: 'Continue with email' })).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Close' }));
  await userEvent.press(screen.getByRole('button', { name: 'Privacy Policy' }));
  expect(screen.getByRole('header', { name: 'Privacy Policy' })).toBeTruthy();
  expect(onboardingStore.getState().data.step).toBe('O01');
});
test.each([
  ['O02', 'O03'],
  ['O03', 'O04'],
])('intro %s retains the welcome footer and advances to %s', async (step, next) => {
  mockParams.step = step;
  onboardingStore.getState().reset();
  await render(
    <AppRuntimeProvider>
      <OnboardingRoute />
    </AppRuntimeProvider>,
  );
  expect(screen.queryByLabelText('Setup progress')).toBeNull();
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Get started' }));
  expect(mockSetParams).toHaveBeenCalledWith({ step: next });
  mockParams.step = 'O01';
});
