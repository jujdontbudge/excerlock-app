import { render } from '@testing-library/react-native';
import { ConditionDemo } from '../ConditionDemo';
import { createDraft } from '../../../rules/draft';
import { Schedule } from '../../../../domain/types';
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({}) }));
// The stock mock recreates shared values on every render; keep them stable across re-renders.
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

test('the walking demo plays on its own with no hold control under Continue', async () => {
  const view = await render(<ConditionDemo draft={walkState} schedule={schedule} answers={{}} onBack={jest.fn()} />);
  expect(view.queryByTestId('condition-demo-hold')).toBeNull();
  expect(view.queryByText('Continue walking')).toBeNull();
  expect(view.queryByText('hold to walk')).toBeNull();
});
