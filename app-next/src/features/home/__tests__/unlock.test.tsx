import { renderHook } from '@testing-library/react-native';
import { useUnlockMoment } from '../useUnlockMoment';
import { feedback } from '../../../motion/haptics';
jest.mock('../../../motion/haptics', () => ({ feedback: jest.fn(), setHapticsEnabled: jest.fn() }));
test('one success response on entering met, none on initial met or repeated ticks', async () => {
  const r = await renderHook((props: unknown) => useUnlockMoment((props as { state: string }).state), {
    initialProps: { state: 'locked' },
  });
  await r.rerender({ state: 'unlockedMet' });
  await r.rerender({ state: 'unlockedMet' });
  expect(feedback).toHaveBeenCalledTimes(1);
  expect(feedback).toHaveBeenCalledWith('success');
  await r.unmount();
  jest.mocked(feedback).mockClear();
  await renderHook(() => useUnlockMoment('unlockedMet'));
  expect(feedback).not.toHaveBeenCalled();
});
