import { render, screen, fireEvent, userEvent } from '@testing-library/react-native';
import { O04 } from '../screens/O04';
import { ChoiceQuestion } from '../scenes/ChoiceQuestion';
test('name edits are persisted and oversized names show an inline error', async () => {
  const setAnswer = jest.fn();
  const view = await render(<O04 answers={{}} setAnswer={setAnswer} />);
  await fireEvent.changeText(screen.getByLabelText('First name'), 'Alex');
  expect(setAnswer).toHaveBeenCalledWith('name', 'Alex');
  await view.rerender(<O04 answers={{ name: 'a'.repeat(31) }} setAnswer={setAnswer} />);
  expect(screen.getByRole('alert')).toHaveTextContent(/30 characters/);
});
test.each([
  ['O05', 'Friend', 'referralSource', 'friend'],
  ['O06', '25–34', 'ageBand', '25–34'],
  ['O07', 'Employed', 'occupation', 'Employed'],
  ['O08', 'More exercise', 'improveFirst', 'exercise'],
  ['O09', 'Focus on what matters', 'mainReason', 'focus'],
])('%s commits its selected answer', async (step, label, key, value) => {
  const setAnswer = jest.fn();
  await render(<ChoiceQuestion step={step} answers={{}} setAnswer={setAnswer} />);
  await userEvent.press(screen.getByRole('radio', { name: label }));
  expect(setAnswer).toHaveBeenCalledWith(key, value);
});
