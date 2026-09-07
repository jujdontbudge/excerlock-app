import { render, screen, userEvent } from '@testing-library/react-native';
import { OnboardingHeader } from '../OnboardingHeader';
test('onboarding navigation combines accessible back and persistent progress', async () => {
  const back = jest.fn();
  await render(<OnboardingHeader progress={0.5} onBack={back} />);
  expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(50);
  await userEvent.press(screen.getByRole('button', { name: 'Back' }));
  expect(back).toHaveBeenCalledTimes(1);
});
test('shared header retains accessible close alongside the thicker progress bar', async () => {
  const close = jest.fn();
  await render(<OnboardingHeader progress={0.25} onBack={jest.fn()} onClose={close} />);
  expect(screen.getByRole('progressbar')).toHaveStyle({ height: 8 });
  await userEvent.press(screen.getByRole('button', { name: 'Close' }));
  expect(close).toHaveBeenCalledTimes(1);
});
