import { render, screen, userEvent } from '@testing-library/react-native';
import { WalkingScreen } from '../WalkingScreen';
import { createDraft } from '../draft';
import { canContinue } from '../../../onboarding/validation';
test('walking places persist as preferences and modes report draft actions', async () => {
  const onAction = jest.fn();
  const r = await render(<WalkingScreen step="W1" draft={createDraft('walking')} onAction={onAction} />);
  await userEvent.press(screen.getByRole('checkbox', { name: 'Treadmill' }));
  await r.rerender(<WalkingScreen step="W2" draft={createDraft('walking')} onAction={onAction} />);
  await userEvent.press(screen.getByRole('radio', { name: 'Unlock while walking' }));
  expect(onAction).toHaveBeenCalledWith({ type: 'setWalkingMode', value: 'state' });
  expect(screen.queryByText('Apps open while you walk, close when you stop')).toBeNull();
});
test('walking minutes use their own bounded goal', async () => {
  const onAction = jest.fn(), draft = { ...createDraft('walking'), walkingMode: 'minutes' as const };
  await render(<WalkingScreen step="W3" draft={draft} onAction={onAction} />);
  expect(screen.getByLabelText('Daily walking time')).toBeTruthy();
  expect(screen.getByText('−5 min')).toBeTruthy();
  expect(screen.getByText('+5 min')).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Add 5 minutes' }));
  expect(onAction).toHaveBeenLastCalledWith({ type: 'setWalkMinutes', value: 25 });
  expect(canContinue('W3', { walkingMode: 'minutes', walkMinutes: 20 })).toBe(true);
});
test('step field keeps bounded steppers without duration helper copy', async () => {
  const onAction = jest.fn(),
    draft = createDraft('walking');
  const r = await render(<WalkingScreen step="W3" draft={draft} onAction={onAction} />);
  expect(screen.queryByText('About 50 minutes of walking')).toBeNull();
  expect(screen.getByText('−500 steps')).toBeTruthy();
  expect(screen.getByText('+500 steps')).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Add 500 steps' }));
  expect(onAction).toHaveBeenLastCalledWith({ type: 'setStepGoal', value: 5500 });
  await r.rerender(<WalkingScreen step="W3" draft={{ ...draft, stepGoal: 500 }} onAction={onAction} />);
  expect(screen.getByRole('button', { name: 'Remove 500 steps' })).toBeDisabled();
});
test('invalid typed step goals block progression', () => {
  expect(canContinue('W3', { stepGoal: 125 })).toBe(false);
  expect(canContinue('W3', { stepGoal: 5000 })).toBe(true);
});
test('review step goal remains editable without changing normal or minute increments', async () => {
  const onAction = jest.fn();
  const reviewDraft = { ...createDraft('walking'), stepGoal: 20 };
  const r = await render(<WalkingScreen step="W3" draft={reviewDraft} onAction={onAction} />);
  expect(screen.queryByText('Enter a goal from 500 to 30,000 steps')).toBeNull();
  expect(screen.getByRole('button', { name: 'Remove 500 steps' })).toBeDisabled();
  await userEvent.press(screen.getByRole('button', { name: 'Add 500 steps' }));
  expect(onAction).toHaveBeenLastCalledWith({ type: 'setStepGoal', value: 500 });

  await r.rerender(<WalkingScreen step="W3" draft={{ ...reviewDraft, walkingMode: 'minutes' }} onAction={onAction} />);
  await userEvent.press(screen.getByRole('button', { name: 'Add 5 minutes' }));
  expect(onAction).toHaveBeenLastCalledWith({ type: 'setWalkMinutes', value: 25 });
});
