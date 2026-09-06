import { render, screen, fireEvent } from '@testing-library/react-native';
import { O10 } from '../screens/O10';
import { O11 } from '../screens/O11';
test('scrolling hours use a 3-hour default and save minutes in half-hour increments', async () => {
  const setAnswer = jest.fn();
  await render(<O10 answers={{}} setAnswer={setAnswer} />);
  await fireEvent(screen.getByRole('adjustable'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
  expect(setAnswer).toHaveBeenCalledWith('estimatedDailyMinutes', 210);
});
test('time math uses the user’s estimate for daily, monthly and yearly totals', async () => {
  await render(<O11 answers={{ estimatedDailyMinutes: 180 }} setAnswer={jest.fn()} />);
  expect(screen.getByLabelText('3 hours every day')).toBeTruthy();
  expect(screen.getByLabelText('90 hours a month')).toBeTruthy();
  expect(screen.getByLabelText('46 days a year')).toBeTruthy();
});
