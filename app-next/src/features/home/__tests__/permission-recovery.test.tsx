import { renderRouter, screen } from 'expo-router/testing-library';
import { act, userEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { permissionsStore } from '../../../state/permissionsStore';
import { HomeScreen } from '../HomeScreen';

async function renderHome() {
  const runtime = createRuntime();
  await runtime.dev.load('multi-rule-overlap');
  await renderRouter(
    {
      _layout: () => (
        <AppRuntimeProvider runtime={runtime}>
          <HomeScreen />
        </AppRuntimeProvider>
      ),
      index: () => null,
    },
    { initialUrl: '/' },
  );
  return runtime;
}

test('Home asks for Screen Time while the permission is undecided', async () => {
  const runtime = await renderHome();
  const request = jest.spyOn(runtime.screenTime, 'requestAuthorization').mockResolvedValue('granted');
  await act(async () => permissionsStore.getState().patch({ screenTime: 'notDetermined' }));

  await userEvent.press(screen.getByRole('button', { name: 'Allow Screen Time' }));
  expect(request).toHaveBeenCalledTimes(1);
  request.mockRestore();
});

test.each(['denied', 'restricted'] as const)(
  'Home offers Open Settings and never re-asks once Screen Time is %s',
  async (status) => {
    const runtime = await renderHome();
    const request = jest.spyOn(runtime.screenTime, 'requestAuthorization');
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    await act(async () => permissionsStore.getState().patch({ screenTime: status }));

    expect(screen.queryByRole('button', { name: 'Allow Screen Time' })).toBeNull();
    await userEvent.press(screen.getByRole('button', { name: 'Open Settings' }));
    expect(openSettings).toHaveBeenCalledTimes(1);
    expect(request).not.toHaveBeenCalled();
    openSettings.mockRestore();
    request.mockRestore();
  },
);
