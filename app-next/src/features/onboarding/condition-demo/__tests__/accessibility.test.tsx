import { render } from '@testing-library/react-native';
import * as RN from 'react-native';
import { ConditionDemo } from '../ConditionDemo';
import { createDraft } from '../../../rules/draft';
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({}) }));

test('large text keeps an accessible explanation', async () => {
  const dimensions = jest.spyOn(RN, 'useWindowDimensions').mockReturnValue({ width: 402, height: 874, scale: 3, fontScale: 2 });
  try {
    const view = await render(<ConditionDemo draft={{ ...createDraft('walking'), walkingMode: 'state' }} schedule={{ window: { kind: 'allDay' }, days: [0, 1, 2, 3, 4, 5, 6] }} answers={{}} onBack={jest.fn()} />);
    expect(view.getByLabelText(/Unlocked while you walk/)).toBeTruthy();
  } finally { dimensions.mockRestore(); }
});

test('"Be at the gym" promises unlocking while there, not a timer', async () => {
  const view = await render(<ConditionDemo draft={createDraft('gym')} schedule={{ window: { kind: 'allDay' }, days: [0, 1, 2, 3, 4, 5, 6] }} answers={{}} onBack={jest.fn()} />);
  expect(view.getByText("While you're at the gym, your apps stay unlocked.")).toBeTruthy();
  expect(view.queryByText(/minutes at the gym/)).toBeNull();
});
