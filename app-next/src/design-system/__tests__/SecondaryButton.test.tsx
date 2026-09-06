import { render, screen, userEvent } from '@testing-library/react-native';
import { SecondaryButton } from '../SecondaryButton';
test.each(['secondary', 'tertiary'] as const)('%s action is accessible and responds', async (variant) => {
  const action = jest.fn();
  await render(<SecondaryButton label="Not now" onPress={action} variant={variant} />);
  await userEvent.press(screen.getByRole('button', { name: 'Not now' }));
  expect(action).toHaveBeenCalledTimes(1);
});
