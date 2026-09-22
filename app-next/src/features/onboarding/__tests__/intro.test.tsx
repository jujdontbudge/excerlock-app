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
  expect(screen.getByRole('header', { name: 'Block apps. Move more.' })).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Get started' }));
  expect(mockSetParams).toHaveBeenCalledWith({ step: 'O02' });
  expect(onboardingStore.getState().data.step).toBe('O02');
});
test('welcome keeps only the bottom CTA and local sign-in without legal copy', async () => {
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
  expect(screen.queryByText(/By continuing/)).toBeNull();
  expect(screen.queryByRole('button', { name: 'Privacy Policy' })).toBeNull();
  expect(onboardingStore.getState().data.step).toBe('O01');
});
test.each([
  ['O02', 'O03'],
  ['O03', 'O07'],
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
