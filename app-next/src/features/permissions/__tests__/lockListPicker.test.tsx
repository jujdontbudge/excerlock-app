import { Alert, Linking } from 'react-native';
import { act, screen, userEvent } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { ScreenTimeAuthorizationError } from '../../../screentime/ScreenTimeAuthorizationError';
import { HomeScreen } from '../../home/HomeScreen';
import { ConditionsScreen } from '../../conditions/ConditionsScreen';
import { PreferencesScreen } from '../../settings/PreferencesScreen';

jest.mock('../../../motion/haptics', () => ({ feedback: jest.fn() }));

const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
beforeEach(() => { alert.mockClear(); openSettings.mockClear(); });

async function renderWith(Screen: () => React.JSX.Element, failure: unknown) {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  const present = jest.spyOn(runtime.screenTime, 'presentAppPicker').mockRejectedValue(failure);
  await renderRouter({
    _layout: () => <AppRuntimeProvider runtime={runtime}><Screen /></AppRuntimeProvider>,
    index: () => null,
  });
  return { runtime, present };
}

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

describe.each([
  ['Home', () => <HomeScreen />, 'Lock list'],
  ['Conditions', () => <ConditionsScreen onAdd={() => undefined} onEdit={() => undefined} />, 'Lock list'],
  ['Preferences', () => <PreferencesScreen navigate={() => undefined} onBack={() => undefined} />, 'Locked apps'],
])('%s lock-apps control', (_name, Screen, label) => {
  test('a picker failure is surfaced, never swallowed', async () => {
    const { runtime, present } = await renderWith(Screen, new Error('Screen Time picker host is not configured'));
    await userEvent.press(screen.getByRole('button', { name: label }));
    await flush();
    expect(present).toHaveBeenCalledTimes(1);
    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert.mock.calls[0]![1]).toContain('Screen Time picker host is not configured');
    runtime.dispose();
  });

  test('a denied Screen Time authorization offers iOS Settings', async () => {
    const { runtime } = await renderWith(Screen, new ScreenTimeAuthorizationError('denied'));
    await userEvent.press(screen.getByRole('button', { name: label }));
    await flush();
    expect(alert).toHaveBeenCalledTimes(1);
    const buttons = alert.mock.calls[0]![2] as { text?: string; onPress?: () => void }[];
    const settings = buttons.find((b) => b.text === 'Open Settings');
    expect(settings).toBeTruthy();
    settings!.onPress?.();
    expect(openSettings).toHaveBeenCalledTimes(1);
    runtime.dispose();
  });
});
