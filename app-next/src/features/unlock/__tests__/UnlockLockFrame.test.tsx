import { render, screen, act } from '@testing-library/react-native';
import { View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { UnlockLockFrame, UnlockPhase } from '../../../design-system/UnlockLockFrame';
function Frame({ phase }: { phase: UnlockPhase }) {
  const progress = useSharedValue(phase === 'lifted' ? 1 : 0);
  return <UnlockLockFrame surface={<View testID="surface" />} phase={phase} progress={progress} />;
}
test('reduced-motion frame changes lock semantics and retains its surface', async () => {
  jest.useFakeTimers();
  const view = await render(<Frame phase="idle" />);
  expect(screen.getByLabelText('Lock closed')).toBeTruthy();
  await view.rerender(<Frame phase="lifted" />);
  await act(() => jest.advanceTimersByTime(1800));
  expect(screen.getByLabelText('Lock open')).toBeTruthy();
  expect(screen.getByTestId('surface')).toBeTruthy();
  await view.unmount(); jest.useRealTimers();
});
