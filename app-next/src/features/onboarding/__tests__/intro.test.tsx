import { render, screen, userEvent } from '@testing-library/react-native';
import { OnboardingRoute } from '../OnboardingRoute';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { onboardingStore } from '../../../state/onboardingStore';
const mockParams = { step: 'O01' };
const mockSetParams = jest.fn();
jest.mock('expo-router', () => ({
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
