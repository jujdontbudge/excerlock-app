import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { createDraft, toRule } from '../../rules/draft';
import { WalkingCheckButton } from '../WalkingCheckButton';
import { HomeScreen } from '../HomeScreen';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { createRuntime } from '../../../runtime/createRuntime';
import { renderRouter } from 'expo-router/testing-library';

jest.mock('../../../motion/haptics', () => ({ feedback: jest.fn() }));
const rule = toRule(
  { ...createDraft('walking'), walkingMode: 'state' },
  { days: [1, 2, 3, 4, 5], window: { kind: 'allDay' } },
);

test('three-second walking check reports detected and missed while keeping its idle label during observation', async () => {
  const start = jest.fn().mockResolvedValue(undefined), unsubscribe = jest.fn();
  let detectedFinish!: () => void | Promise<void>;
  let missedFinish!: () => void | Promise<void>;
  await render(<>
    <WalkingCheckButton
      rule={rule}
      observe={(callback) => { callback(true); return unsubscribe; }}
      start={start}
      schedule={(callback) => { detectedFinish = callback; }}
    />
    <WalkingCheckButton
      rule={{ ...rule, id: 'missed' }}
      observe={(callback) => { callback(false); return unsubscribe; }}
      start={start}
      schedule={(callback) => { missedFinish = callback; }}
    />
  </>);
  const [detectedButton] = screen.getAllByRole('button', { name: 'Check walking' });
  fireEvent.press(detectedButton!);
  expect(screen.getAllByRole('button', { name: 'Check walking' })).toHaveLength(2);
  await act(async () => { await detectedFinish(); });
  expect(screen.getByRole('button', { name: 'Detected' })).toBeTruthy();

  fireEvent.press(screen.getByRole('button', { name: 'Check walking' }));
  expect(screen.getByRole('button', { name: 'Check walking' })).toBeTruthy();
  await act(async () => { await missedFinish(); });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Not detected — hold your phone and walk' })).toBeTruthy());
  expect(unsubscribe).toHaveBeenCalledTimes(2);
  expect(start).toHaveBeenCalledTimes(1);
});

test('state walking card has no percentage, progress bar, or detecting copy', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('walk-state-ready');
  await renderRouter({
    _layout: () => <AppRuntimeProvider runtime={runtime}><HomeScreen /></AppRuntimeProvider>,
    index: () => null,
  });
  expect(screen.queryByText(/Detecting/)).toBeNull();
  expect(screen.queryByText(/%/)).toBeNull();
  expect(screen.queryByRole('progressbar')).toBeNull();
  runtime.dispose();
});
