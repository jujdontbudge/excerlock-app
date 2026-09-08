import { render, screen, userEvent } from '@testing-library/react-native';
import { O15 } from '../screens/O15';
import { O20 } from '../screens/O20';
import { PreBranchScreen } from '../PreBranchScreen';
test('O15 shows the visible illustrative caption under one accessible trend card', async () => {
  await render(<O15 />);
  expect(screen.getByRole('header', { name: 'This is good.' })).toBeTruthy();
  expect(screen.getByText('We’ll use your screen time habits to help you exercise more.')).toBeTruthy();
  expect(screen.getByText('Now')).toBeTruthy();
  expect(screen.getByText('Future')).toBeTruthy();
  expect(screen.getByText('Illustrative, not a forecast')).toBeTruthy();
  expect(screen.getAllByLabelText('Illustrative trend: exercise rises as screen time falls.')).toHaveLength(1);
});
test('choosing an exercise writes the activity without advancing prematurely', async () => {
  const setAnswer = jest.fn();
  await render(<O20 answers={{}} setAnswer={setAnswer} />);
  await userEvent.press(screen.getByRole('radio', { name: 'Walking' }));
  expect(setAnswer).toHaveBeenCalledWith('activity', 'walking');
});

test('O19 renders three principle rows with icons and no institution logo', async () => {
  await render(<PreBranchScreen step="O19" answers={{}} setAnswer={jest.fn()} />);
  for (const title of ['Start small', 'Make it repeatable', 'Reward the action']) {
    expect(screen.getByText(title)).toBeTruthy();
  }
  expect(screen.getAllByRole('image')).toHaveLength(3);
  expect(screen.queryByLabelText(/university|institution/i)).toBeNull();
});
