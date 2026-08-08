import { Alert, type AlertButton } from 'react-native';
import {
  act,
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from 'expo-router/testing-library';

async function expectPathname(result: ReturnType<typeof renderRouter>, pathname: string) {
  await waitFor(() => expect(result.getPathname()).toBe(pathname));
}

describe('onboarding app selection navigation', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('discards a staged edit and preserves a committed edit across Review returns', async () => {
    let alertButtons: AlertButton[] | undefined;
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      alertButtons = buttons;
    });
    const result = renderRouter('./src/app', { initialUrl: '/onboarding/review' });
    await result;

    await fireEvent.press(screen.getByLabelText('Locked apps'));
    await expectPathname(result, '/onboarding/apps');
    await fireEvent.press(screen.getByLabelText('Circle'));
    await fireEvent.press(screen.getByLabelText('Cancel'));
    await act(() => alertButtons?.find((button) => button.text === 'Discard and go back')?.onPress?.());
    await expectPathname(result, '/onboarding/review');

    await fireEvent.press(screen.getByLabelText('Locked apps'));
    await expectPathname(result, '/onboarding/apps');
    expect(screen.getByLabelText('Circle')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Circle'));
    await fireEvent.press(screen.getByLabelText('Done'));
    await expectPathname(result, '/onboarding/review');
    await fireEvent.press(screen.getByLabelText('Locked apps'));
    await expectPathname(result, '/onboarding/apps');
    expect(screen.getByLabelText('Circle, selected')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Cancel'));
    await expectPathname(result, '/onboarding/review');
  });
});
