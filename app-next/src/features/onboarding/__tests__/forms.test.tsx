import { render, screen, fireEvent, userEvent } from '@testing-library/react-native';
import { O04 } from '../screens/O04';
import { ChoiceQuestion } from '../scenes/ChoiceQuestion';
test('name edits are persisted and oversized names show an inline error', async () => {
  const setAnswer = jest.fn();
  const view = await render(<O04 answers={{}} setAnswer={setAnswer} />);
  expect(screen.getByText('Let’s make this personal.')).toBeTruthy();
  expect(screen.getByLabelText('First name')).toHaveProp('autoFocus', false);
  await fireEvent.changeText(screen.getByLabelText('First name'), 'Alex');
  expect(setAnswer).toHaveBeenCalledWith('name', 'Alex');
  await view.rerender(<O04 answers={{ name: 'a'.repeat(31) }} setAnswer={setAnswer} />);
  expect(screen.getByRole('alert')).toHaveTextContent(/30 characters/);
});
test.each([
  ['O05', 'Friends', 'referralSource', 'friend'],
  ['O06', '25–34', 'ageBand', '25–34'],
  ['O07', 'Remote worker', 'occupation', 'Remote worker'],
  ['O08', 'More exercise', 'improveFirst', 'exercise'],
  ['O09', 'Focus on what matters', 'mainReason', 'focus'],
])('%s commits its selected answer', async (step, label, key, value) => {
  const setAnswer = jest.fn();
  await render(<ChoiceQuestion step={step} answers={{}} setAnswer={setAnswer} />);
  await userEvent.press(screen.getByRole('radio', { name: label }));
  expect(setAnswer).toHaveBeenCalledWith(key, value);
});
test('reference age choices include both older age bands', async () => {
  const setAnswer = jest.fn();
  await render(<ChoiceQuestion step="O06" answers={{}} setAnswer={setAnswer} />);
  expect(screen.getAllByRole('radio')).toHaveLength(7);
  await userEvent.press(screen.getByRole('radio', { name: '65+' }));
  expect(setAnswer).toHaveBeenCalledWith('ageBand', '65+');
});
test('referral sources follow the reference order', async () => {
  await render(<ChoiceQuestion step="O05" answers={{}} setAnswer={jest.fn()} />);
  expect(screen.getAllByRole('radio').map((row) => row.props.accessibilityLabel)).toEqual([
    'YouTube',
    'Instagram',
    'TikTok',
    'App Store',
    'Friends',
    'Other',
  ]);
});
test('selected onboarding answers use white text on their orange selection', async () => {
  await render(<ChoiceQuestion step="O05" answers={{ referralSource: 'youtube' }} setAnswer={jest.fn()} />);
  expect(screen.getByRole('radio', { name: 'YouTube' })).toBeChecked();
  expect(screen.getByText('YouTube')).toHaveStyle({ color: '#FFFFFF' });
});
test('goal question keeps its three existing answer choices', async () => {
  await render(<ChoiceQuestion step="O08" answers={{}} setAnswer={jest.fn()} />);
  expect(screen.getByRole('header', { name: 'What is your goal?' })).toBeTruthy();
  expect(screen.getAllByRole('radio').map((row) => row.props.accessibilityLabel)).toEqual([
    'More exercise',
    'Less screen time',
    'Overall wellness',
  ]);
});
