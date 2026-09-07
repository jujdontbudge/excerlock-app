import { act, renderHook } from '@testing-library/react-native';
import { useImpactPlayback } from '../impact/useImpactPlayback';
jest.mock('../../../motion/useMotion', () => ({ useMotion: () => ({ reduced: false }) }));
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
test('year and free-time beats advance automatically, final beat reveals Continue', async () => {
  const advance = jest.fn();
  const hook = await renderHook<{ hideContinue: boolean }, { step: string }>(
    ({ step }) => useImpactPlayback(step, advance),
    { initialProps: { step: 'O12' } },
  );
  expect(hook.result.current.hideContinue).toBe(true);
  await act(() => jest.advanceTimersByTime(1800));
  expect(advance).toHaveBeenCalledTimes(1);
  await hook.rerender({ step: 'O13' });
  await act(() => jest.advanceTimersByTime(1600));
  expect(advance).toHaveBeenCalledTimes(2);
  await hook.rerender({ step: 'O14' });
  await act(() => jest.advanceTimersByTime(3000));
  expect(advance).toHaveBeenCalledTimes(2);
  expect(hook.result.current.hideContinue).toBe(false);
});
test('leaving the sequence cancels automatic navigation', async () => {
  const advance = jest.fn();
  const hook = await renderHook<{ hideContinue: boolean }, { step: string }>(
    ({ step }) => useImpactPlayback(step, advance),
    { initialProps: { step: 'O12' } },
  );
  await act(() => jest.advanceTimersByTime(800));
  await hook.rerender({ step: 'O11' });
  await act(() => jest.advanceTimersByTime(3000));
  expect(advance).not.toHaveBeenCalled();
});
