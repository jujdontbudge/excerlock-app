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
test('presets fill the number, and an empty field stays empty with a range error', async () => {
  await render(<Harness />);
  await userEvent.press(screen.getByRole('button', { name: '30 minutes' }));
  expect(screen.getByLabelText('Goal')).toHaveDisplayValue('30');
  await fireEvent.changeText(screen.getByLabelText('Goal'), '');
  expect(screen.getByLabelText('Goal')).toHaveDisplayValue('');
  expect(screen.getByText('Choose 5–300 minutes.')).toBeTruthy();
});
test('distance units change range without converting the numeric input', async () => {
  await render(<Harness distance />);
  await userEvent.press(screen.getByRole('button', { name: 'Unit: mi' }));
  await userEvent.press(screen.getByRole('radio', { name: 'km' }));
  expect(screen.getByLabelText('Distance')).toHaveDisplayValue('2');
  expect(screen.getByText('Choose 0.5–50 km.')).toBeTruthy();
});
