import { render, screen, userEvent } from '@testing-library/react-native';
import { O15 } from '../screens/O15';
import { O19 } from '../screens/O19';
import { O20 } from '../screens/O20';
test('the outcome chart explains the trend without a visible forecast caption', async () => {
  await render(<O15 />);
  expect(screen.getByRole('header', { name: 'This is good.' })).toBeTruthy();
  expect(screen.getByText('We’ll use your screen time habits to help you exercise more.')).toBeTruthy();
  expect(screen.getByText('Now')).toBeTruthy();
  expect(screen.getByText('Future')).toBeTruthy();
  expect(screen.queryByText('Illustrative, not a forecast')).toBeNull();
});
test('principles promise small repeatable habits without borrowed endorsements', async () => {
  await render(<O19 />);
  expect(screen.getByText('Start small')).toBeTruthy();
  expect(screen.getByText('Make it repeatable')).toBeTruthy();
  expect(screen.getByText('Reward the action')).toBeTruthy();
});
test('choosing an exercise writes the activity without advancing prematurely', async () => {
  const setAnswer = jest.fn();
  await render(<O20 answers={{}} setAnswer={setAnswer} />);
  await userEvent.press(screen.getByRole('radio', { name: 'Walking' }));
  expect(setAnswer).toHaveBeenCalledWith('activity', 'walking');
});
