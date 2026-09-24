import { act, render, screen } from '@testing-library/react-native';
import { PlanBuild } from '../PlanBuild';
import { createDraft, toRule } from '../draft';
import { tokens } from '../../../design-system/tokens';
let mockReduced = false;
jest.mock('../../../motion/useMotion', () => ({
  useMotion: () => ({ ...jest.requireActual('../../../motion/useMotion').motionFor(mockReduced) }),
}));
afterEach(() => jest.useRealTimers());
test.each([false, true])('checks real facts and completes once with reduced motion %s', async (reduced) => {
  mockReduced = reduced;
  jest.useFakeTimers();
  const onComplete = jest.fn();
  const rule = toRule(createDraft('walking'), { days: [1, 2, 3, 4, 5], window: { kind: 'allDay' } });
  await render(<PlanBuild rule={rule} onComplete={onComplete} />);
  expect(screen.getByRole('checkbox', { name: 'Walk 10,000 steps' })).not.toBeChecked();
  await act(() => jest.advanceTimersByTime(reduced ? tokens.motion.duration.standard : 6000));
  const boxes = screen.getAllByRole('checkbox');
  // Every pill resolves, the closing one included, before the ring reaches 100%.
  expect(boxes).toHaveLength(6);
  expect(boxes.every((node) => node.props.accessibilityState.checked)).toBe(true);
  expect(onComplete).not.toHaveBeenCalled();
  await act(() => jest.advanceTimersByTime(reduced ? 300 : 300));
  expect(onComplete).toHaveBeenCalledTimes(1);
});
