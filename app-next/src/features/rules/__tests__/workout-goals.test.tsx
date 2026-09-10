import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { createDraft, reduceDraft } from '../draft';
import { WorkoutGoalScreen } from '../WorkoutGoalScreen';
function Harness() {
  const [draft, setDraft] = useState(() => createDraft('gym'));
  return <WorkoutGoalScreen step="G2" draft={draft} onAction={(action) => setDraft(reduceDraft(draft, action))} />;
}
test('wheel shows the current gym minutes and stepping it updates the goal', async () => {
  await render(<Harness />);
  expect(screen.getByLabelText('Goal').props.accessibilityValue).toMatchObject({ min: 10, max: 180, now: 30 });
  await fireEvent(screen.getByLabelText('Goal'), 'accessibilityAction', {
    nativeEvent: { actionName: 'increment' },
  });
  expect(screen.getByLabelText('Goal').props.accessibilityValue).toMatchObject({ now: 35 });
});
test('out-of-range gym minutes show the range hint', async () => {
  const { rerender } = await render(<Harness />);
  expect(screen.queryByText('Choose 10–180 minutes.')).toBeNull();
  await rerender(
    <WorkoutGoalScreen step="G2" draft={{ ...createDraft('gym'), gymMinutes: 5 }} onAction={() => {}} />,
  );
  expect(screen.getByText('Choose 10–180 minutes.')).toBeTruthy();
});
