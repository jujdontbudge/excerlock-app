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

test('bounded port check reports detected and missed without a UI-owned timer', async () => {
  const detected = jest.fn().mockResolvedValue(true), missed = jest.fn().mockResolvedValue(false);
  await render(<>
    <WalkingCheckButton
      rule={rule}
      checkWalking={detected}
    />
    <WalkingCheckButton
      rule={{ ...rule, id: 'missed' }}
      checkWalking={missed}
    />
  </>);
  const [detectedButton] = screen.getAllByRole('button', { name: 'Check walking' });
  fireEvent.press(detectedButton!);
  await act(async () => { await Promise.resolve(); });
  expect(screen.getByRole('button', { name: 'Detected' })).toBeTruthy();

  fireEvent.press(screen.getByRole('button', { name: 'Check walking' }));
  await act(async () => { await Promise.resolve(); });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Not detected — hold your phone and walk' })).toBeTruthy());
  expect(detected).toHaveBeenCalledTimes(1);
  expect(missed).toHaveBeenCalledTimes(1);
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
