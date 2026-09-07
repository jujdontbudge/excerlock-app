import { render, screen, fireEvent } from '@testing-library/react-native';
import { O10 } from '../screens/O10';
import { O11 } from '../screens/O11';
test('scrolling ranges retain the default and save an estimate for downstream math', async () => {
  const setAnswer = jest.fn();
  await render(<O10 answers={{}} setAnswer={setAnswer} />);
  expect(screen.getAllByRole('radio')).toHaveLength(5);
  expect(screen.getByRole('radio', { name: '2 to 4 hours' }).props.accessibilityState.selected).toBe(true);
  await fireEvent.press(screen.getByRole('radio', { name: '4 to 6 hours' }));
  expect(setAnswer).toHaveBeenCalledWith('estimatedDailyMinutes', 300);
});
test('time math uses the user’s estimate for daily, monthly and yearly totals', async () => {
  await render(<O11 answers={{ estimatedDailyMinutes: 180 }} setAnswer={jest.fn()} />);
  expect(screen.getByLabelText('3 hours every day')).toBeTruthy();
  expect(screen.getByLabelText('90 hours a month')).toBeTruthy();
  expect(screen.getByLabelText('46 days a year')).toBeTruthy();
});
