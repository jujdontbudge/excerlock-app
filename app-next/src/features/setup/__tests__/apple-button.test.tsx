import * as AppleAuthentication from 'expo-apple-authentication';
import { render, screen, userEvent } from '@testing-library/react-native';
import { AppleSignInButton } from '../AppleSignInButton';
import { setupCopy } from '../../../content/setup';

const isAvailable = AppleAuthentication.isAvailableAsync as jest.Mock;

afterEach(() => isAvailable.mockResolvedValue(false));

test('a device that can run Sign in with Apple gets Apple own button', async () => {
  isAvailable.mockResolvedValue(true);
  const onPress = jest.fn();
  await render(<AppleSignInButton label={setupCopy.apple} onPress={onPress} />);
  const button = await screen.findByLabelText(setupCopy.apple);
  expect(button.type).toBe('AppleAuthenticationButton');
  await userEvent.press(button);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('a busy Apple button does not start a second sheet', async () => {
  isAvailable.mockResolvedValue(true);
  const onPress = jest.fn();
  await render(<AppleSignInButton label={setupCopy.apple} onPress={onPress} loading />);
  await userEvent.press(await screen.findByLabelText(setupCopy.apple));
  expect(onPress).not.toHaveBeenCalled();
});

test('everywhere else the app own button stands in and still signs in', async () => {
  const onPress = jest.fn();
  await render(<AppleSignInButton label={setupCopy.apple} onPress={onPress} />);
  const button = screen.getByRole('button', { name: setupCopy.apple });
  expect(button.type).not.toBe('AppleAuthenticationButton');
  await userEvent.press(button);
  expect(onPress).toHaveBeenCalledTimes(1);
});
