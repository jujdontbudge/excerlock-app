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
function WalkingHarness() {
  const [draft, setDraft] = useState(() => ({ ...createDraft('walking'), place: 'treadmill' as const, walkingMode: 'minutes' as const }));
  return (
    <WorkoutGoalScreen step="W4" draft={draft} onAction={(action) => setDraft(reduceDraft(draft, action))} />
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
test('walking duration uses its own presets, bounds and treadmill lease note', async () => {
  await render(<WalkingHarness />);
  expect(screen.getByLabelText('Goal')).toHaveDisplayValue('20');
  expect(screen.getByText('Choose 10–120 minutes.')).toBeTruthy();
  expect(screen.getByText("You'll be asked to scan again every 15 minutes.")).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: '15 minutes' }));
  expect(screen.getByLabelText('Goal')).toHaveDisplayValue('15');
  expect(screen.queryByText("You'll be asked to scan again every 15 minutes.")).toBeNull();
});
