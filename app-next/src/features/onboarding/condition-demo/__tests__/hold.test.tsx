import { act, fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ConditionDemo } from '../ConditionDemo';
import { createDraft } from '../../../rules/draft';
import { Schedule } from '../../../../domain/types';
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({}) }));
// The stock mock recreates shared values on every render; the hold press must survive the re-render it causes.
jest.mock('react-native-reanimated', () => {
  const mock = jest.requireMock('react-native-reanimated/mock');
  const { useRef } = jest.requireActual('react');
  return {
    ...mock,
    useSharedValue: (init: unknown) => {
      const shared = useRef(null);
      shared.current ??= mock.useSharedValue(init);
      return shared.current;
    },
  };
});

const walkState = { ...createDraft('walking'), walkingMode: 'state' as const };
const schedule: Schedule = { window: { kind: 'allDay' }, days: [0, 1, 2, 3, 4, 5, 6] };

test('pressing the hold control fills it completely at once and releasing empties it', async () => {
  const view = await render(<ConditionDemo draft={walkState} schedule={schedule} answers={{}} />);
  const hold = view.getByTestId('condition-demo-hold');
  const fillWidth = () => StyleSheet.flatten(view.getByTestId('condition-demo-hold-fill').props.style).width;
  expect(fillWidth()).toBe('0%');
  expect(hold.props.accessibilityValue).toEqual({ text: 'Hold to try walking.' });
  await act(async () => fireEvent(hold, 'pressIn'));
  expect(fillWidth()).toBe('100%');
  expect(hold.props.accessibilityValue).toEqual({ text: 'Walking. Apps open.' });
  expect(view.getByTestId(/condition-demo-walk-state-outside-walking-tiktok-unlocked/)).toBeTruthy();
  await act(async () => fireEvent(hold, 'pressOut'));
  expect(fillWidth()).toBe('0%');
  expect(hold.props.accessibilityValue).toEqual({ text: 'Stopped. Apps blocked.' });
  expect(view.getByTestId(/condition-demo-walk-state-outside-blocked-shield-locked/)).toBeTruthy();
});
