jest.mock('../../../motion/haptics', () => ({ setHapticsEnabled: jest.fn(), feedback: jest.fn() }));
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Preferences } from '../PreferencesPanel';
import { createRuntime } from '../../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { settingsStore } from '../../../state/settingsStore';
import { feedback } from '../../../motion/haptics';
import { settingsCopy as c } from '../../../content/settings';

const tap = feedback as jest.Mock;

async function panel() {
  const runtime = createRuntime();
  await runtime.dev.load('home-locked-walking');
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <Preferences onGrace={() => undefined} />
    </AppRuntimeProvider>,
  );
  return runtime;
}

test('turning touch feedback off suppresses the confirming tap', async () => {
  settingsStore.getState().patch({ haptics: true });
  const runtime = await panel();
  tap.mockClear();

  await fireEvent(screen.getByRole('switch', { name: c.haptics }), 'valueChange', false);

  expect(settingsStore.getState().data.haptics).toBe(false);
  expect(tap).not.toHaveBeenCalled();
  runtime.dispose();
});

test('turning touch feedback back on fires one confirming tap', async () => {
  settingsStore.getState().patch({ haptics: false });
  const runtime = await panel();
  tap.mockClear();

  await fireEvent(screen.getByRole('switch', { name: c.haptics }), 'valueChange', true);

  expect(settingsStore.getState().data.haptics).toBe(true);
  expect(tap).toHaveBeenCalledTimes(1);
  runtime.dispose();
});
