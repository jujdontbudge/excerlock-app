import { render, screen, userEvent } from '@testing-library/react-native';
import { PrimaryButton } from '../PrimaryButton';
test('a primary action fires exactly once when pressed', async () => {
  const action = jest.fn();
  await render(<PrimaryButton label="Continue" onPress={action} />);
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(action).toHaveBeenCalledTimes(1);
});
test.each([{ disabled: true }, { loading: true }])('unavailable primary actions cannot submit', async (props) => {
  const action = jest.fn();
  await render(<PrimaryButton label="Continue" onPress={action} {...props} />);
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  await userEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(action).not.toHaveBeenCalled();
});
