import { useState } from 'react';
import { render, screen, userEvent, fireEvent } from '@testing-library/react-native';
import { createDraft, reduceDraft } from '../draft';
import { WorkoutGoalScreen } from '../WorkoutGoalScreen';
function Harness({ distance = false }: { distance?: boolean }) {
  const [draft, setDraft] = useState(() => createDraft('running', 'mi'));
  return (
    <WorkoutGoalScreen
      step={distance ? 'D' : 'R2'}
      draft={draft}
      onAction={(action) => setDraft(reduceDraft(draft, action))}
    />
  );
}
test('wheel shows the current minutes and stepping it updates the goal', async () => {
  await render(<Harness />);
  expect(screen.getByLabelText('Goal').props.accessibilityValue).toMatchObject({ now: 20 });
  await fireEvent(screen.getByLabelText('Goal'), 'accessibilityAction', {
    nativeEvent: { actionName: 'increment' },
  });
  expect(screen.getByLabelText('Goal').props.accessibilityValue).toMatchObject({ now: 25 });
});
test('distance units change range without converting the numeric input', async () => {
  await render(<Harness distance />);
  await userEvent.press(screen.getByRole('button', { name: 'Unit: mi' }));
  await userEvent.press(screen.getByRole('radio', { name: 'km' }));
  expect(screen.getByLabelText('Distance')).toHaveDisplayValue('2');
  expect(screen.queryByText('Choose 0.5–50 km.')).toBeNull();
  expect(screen.getByLabelText('Distance').props.accessibilityValue).toMatchObject({ min: 0.5, max: 50 });
});
