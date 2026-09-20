import { render, screen, userEvent } from '@testing-library/react-native';
import { O15 } from '../screens/O15';
import { O20 } from '../screens/O20';
test('the outcome chart explains the trend without a visible forecast caption', async () => {
  await render(<O15 />);
  expect(screen.getByRole('header', { name: 'We’ll trick your brain into craving exercise instead.' })).toBeTruthy();
  expect(screen.queryByText('This is good.')).toBeNull();
  expect(screen.getByText('Now')).toBeTruthy();
  expect(screen.getByText('Future')).toBeTruthy();
  expect(screen.queryByText('Illustrative, not a forecast')).toBeNull();
});
test('choosing an exercise writes the activity without advancing prematurely', async () => {
  const setAnswer = jest.fn();
  await render(<O20 answers={{}} setAnswer={setAnswer} />);
  await userEvent.press(screen.getByRole('radio', { name: 'Walking' }));
  expect(setAnswer).toHaveBeenCalledWith('activity', 'walking');
  expect(setAnswer).toHaveBeenCalledWith('walkingMode', 'state');
});
test('returning to the exercise picker preserves an explicit walking mode', async () => {
  const setAnswer = jest.fn();
  await render(<O20 answers={{ walkingMode: 'steps' }} setAnswer={setAnswer} />);
  await userEvent.press(screen.getByRole('radio', { name: 'Walking' }));
  expect(setAnswer).toHaveBeenCalledWith('activity', 'walking');
  expect(setAnswer).not.toHaveBeenCalledWith('walkingMode', 'state');
});
