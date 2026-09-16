import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { WalkingScreen } from '../WalkingScreen';
import { createDraft } from '../draft';
import { canContinue } from '../../../onboarding/validation';
test('walking places persist as preferences and modes report draft actions', async () => {
  const onAction = jest.fn();
  const r = await render(<WalkingScreen step="W1" draft={createDraft('walking')} onAction={onAction} />);
  await userEvent.press(screen.getByRole('checkbox', { name: 'Treadmill' }));
  await r.rerender(<WalkingScreen step="W2" draft={createDraft('walking')} onAction={onAction} />);
  await userEvent.press(screen.getByRole('radio', { name: 'Unlock while walking (Recommended)' }));
  expect(onAction).toHaveBeenCalledWith({ type: 'setWalkingMode', value: 'state' });
  expect(screen.queryByText('Apps open while you walk, close when you stop')).toBeNull();
});
test('walking minutes use their own bounded goal', async () => {
  const onAction = jest.fn(), draft = { ...createDraft('walking'), walkingMode: 'minutes' as const };
  await render(<WalkingScreen step="W3" draft={draft} onAction={onAction} />);
  expect(screen.getByLabelText('Daily walking time')).toBeTruthy();
  expect(screen.queryByText('−5 min')).toBeNull();
  expect(screen.queryByText('+5 min')).toBeNull();
  fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
  expect(onAction).toHaveBeenLastCalledWith({ type: 'setWalkMinutes', value: 25 });
  expect(canContinue('W3', { walkingMode: 'minutes', walkMinutes: 20 })).toBe(true);
});
test('step field defaults to 10,000 with no stepper buttons or duration helper copy', async () => {
  const onAction = jest.fn(),
    draft = createDraft('walking');
  await render(<WalkingScreen step="W3" draft={draft} onAction={onAction} />);
  expect(screen.getByRole('adjustable').props.value).toBe('10000');
  expect(screen.queryByText('About 50 minutes of walking')).toBeNull();
  expect(screen.queryByText('−500 steps')).toBeNull();
  expect(screen.queryByText('+500 steps')).toBeNull();
  fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
  expect(onAction).toHaveBeenLastCalledWith({ type: 'setStepGoal', value: 10500 });
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
  fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
  expect(onAction).toHaveBeenLastCalledWith({ type: 'setStepGoal', value: 500 });

  await r.rerender(<WalkingScreen step="W3" draft={{ ...reviewDraft, stepGoal: 500 }} onAction={onAction} />);
  fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
  expect(onAction).toHaveBeenLastCalledWith({ type: 'setStepGoal', value: 500 });

});
