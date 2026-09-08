jest.mock('../haptics', () => ({ setHapticsEnabled: jest.fn(), feedback: jest.fn() }));
import { setHapticsEnabled } from '../haptics';
import { bindHaptics } from '../bindHaptics';
import { settingsStore } from '../../state/settingsStore';

const applied = setHapticsEnabled as jest.Mock;
beforeEach(() => {
  applied.mockClear();
  settingsStore.getState().patch({ haptics: true });
  applied.mockClear();
});

test('a rehydrated haptics:false setting disables feedback before the first screen renders', () => {
  settingsStore.getState().patch({ haptics: false });
  applied.mockClear();

  const stop = bindHaptics();

  expect(applied).toHaveBeenCalledWith(false);
  stop();
});

test('turning touch feedback off suppresses every later feedback call', () => {
  const stop = bindHaptics();
  expect(applied).toHaveBeenLastCalledWith(true);

  settingsStore.getState().patch({ haptics: false });

  expect(applied).toHaveBeenLastCalledWith(false);
  stop();
});

test('turning touch feedback back on re-enables feedback', () => {
  const stop = bindHaptics();
  settingsStore.getState().patch({ haptics: false });

  settingsStore.getState().patch({ haptics: true });

  expect(applied).toHaveBeenLastCalledWith(true);
  stop();
});

test('unsubscribing stops the binding from following later changes', () => {
  const stop = bindHaptics();
  stop();
  applied.mockClear();

  settingsStore.getState().patch({ haptics: false });

  expect(applied).not.toHaveBeenCalled();
});
