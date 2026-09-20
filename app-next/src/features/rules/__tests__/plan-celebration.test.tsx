import { act, render } from '@testing-library/react-native';
import { PlanCelebration } from '../PlanCelebration';
import { PLAN_MOTION } from '../planMotion';
let mockReduced = false;
jest.mock('../../../motion/useMotion', () => ({
  useMotion: () => jest.requireActual('../../../motion/useMotion').motionFor(mockReduced),
}));
beforeEach(() => { jest.useFakeTimers(); mockReduced = false; });
afterEach(() => jest.useRealTimers());
test('navigates while covered, then removes the overlay after the reveal fade', async () => {
  const onCovered = jest.fn(), onDone = jest.fn();
  await render(<PlanCelebration onCovered={onCovered} onDone={onDone} />);
  await act(() => jest.advanceTimersByTime(PLAN_MOTION.covered - 1));
  expect(onCovered).not.toHaveBeenCalled();
  await act(() => jest.advanceTimersByTime(1));
  expect(onCovered).toHaveBeenCalledTimes(1);
  expect(onDone).not.toHaveBeenCalled();
  await act(() => jest.advanceTimersByTime(PLAN_MOTION.done - PLAN_MOTION.covered));
  expect(onDone).toHaveBeenCalledTimes(1);
});
test('leaving the screen cancels both callbacks', async () => {
  const onCovered = jest.fn(), onDone = jest.fn();
  const view = await render(<PlanCelebration onCovered={onCovered} onDone={onDone} />);
  await view.unmount();
  await act(() => jest.runAllTimers());
  expect(onCovered).not.toHaveBeenCalled();
  expect(onDone).not.toHaveBeenCalled();
});
test('reduced motion does not delay the transition for a full burst', async () => {
  mockReduced = true;
  const onCovered = jest.fn(), onDone = jest.fn();
  await render(<PlanCelebration onCovered={onCovered} onDone={onDone} />);
  await act(() => jest.advanceTimersByTime(320));
  expect(onCovered).toHaveBeenCalledTimes(1);
  expect(onDone).toHaveBeenCalledTimes(1);
});
