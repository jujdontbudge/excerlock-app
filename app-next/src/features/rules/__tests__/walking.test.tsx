import { render, screen, userEvent } from '@testing-library/react-native';
import { WalkingScreen } from '../WalkingScreen';
import { createDraft } from '../draft';
import { canContinue } from '../../../onboarding/validation';
test('place and walking mode choices report draft actions', async () => {
  const onAction = jest.fn();
  const r = await render(<WalkingScreen step="W1" draft={createDraft('walking')} onAction={onAction} />);
  await userEvent.press(screen.getByRole('radio', { name: 'Treadmill' }));
  expect(onAction).toHaveBeenCalledWith({ type: 'setPlace', value: 'treadmill' });
  await r.rerender(<WalkingScreen step="W2" draft={createDraft('walking')} onAction={onAction} />);
  await userEvent.press(screen.getByRole('radio', { name: 'Unlock while walking' }));
  expect(onAction).toHaveBeenCalledWith({ type: 'setWalkingMode', value: 'state' });
  expect(screen.getByText('Apps open while you walk, close when you stop')).toBeTruthy();
});
test('step field has bounded steppers and a rounded duration helper', async () => {
  const onAction = jest.fn(),
    draft = createDraft('walking');
  const r = await render(<WalkingScreen step="W3" draft={draft} onAction={onAction} />);
  expect(screen.getByText('About 50 minutes of walking')).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Add 500 steps' }));
  expect(onAction).toHaveBeenLastCalledWith({ type: 'setStepGoal', value: 5500 });
  await r.rerender(<WalkingScreen step="W3" draft={{ ...draft, stepGoal: 500 }} onAction={onAction} />);
  expect(screen.getByRole('button', { name: 'Remove 500 steps' })).toBeDisabled();
});
test('invalid typed step goals block progression', () => {
  expect(canContinue('W3', { stepGoal: 125 })).toBe(false);
  expect(canContinue('W3', { stepGoal: 5000 })).toBe(true);
});
