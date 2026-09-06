import { act, renderHook } from '@testing-library/react-native';
import { Keyboard, KeyboardEvent } from 'react-native';
import { useSheetKeyboard } from '../useSheetKeyboard';

test('sheet moves its footer and constrains scrolling above the keyboard, then restores', async () => {
  const callbacks: Record<string, (event: KeyboardEvent) => void> = {};
  const remove = jest.fn();
  jest.spyOn(Keyboard, 'addListener').mockImplementation((name, callback) => {
    callbacks[name] = callback;
    return { remove } as unknown as ReturnType<typeof Keyboard.addListener>;
  });
  const hook = await renderHook(() => useSheetKeyboard(874));
  await act(() =>
    callbacks.keyboardWillChangeFrame({ endCoordinates: { screenY: 539 }, duration: 250 } as KeyboardEvent),
  );
  expect((hook.result.current as unknown as { bottom: number }).bottom).toBe(335);
  expect((hook.result.current as unknown as { maxHeight: number }).maxHeight).toBeLessThan(539);
  await act(() => callbacks.keyboardWillHide({ duration: 250 } as KeyboardEvent));
  expect((hook.result.current as unknown as { bottom: number }).bottom).toBe(0);
  await hook.unmount();
  expect(remove).toHaveBeenCalledTimes(2);
  jest.restoreAllMocks();
});
