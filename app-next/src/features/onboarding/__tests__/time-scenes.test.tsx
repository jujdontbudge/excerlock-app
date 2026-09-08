import { render, screen, fireEvent } from '@testing-library/react-native';
import { O10 } from '../screens/O10';
import { O11 } from '../screens/O11';
test('the scrolling slider persists exact 30-minute values and reads them back', async () => {
  const setAnswer = jest.fn();
  await render(<O10 answers={{ estimatedDailyMinutes: 270 }} setAnswer={setAnswer} />);
  expect(screen.getByText('4h 30m')).toBeTruthy();
  const slider = screen.getByRole('adjustable', { name: 'Hours scrolling per day' });
  expect(slider).toHaveAccessibilityValue({ min: 60, max: 720, now: 270 });
  fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
  expect(setAnswer).toHaveBeenCalledWith('estimatedDailyMinutes', 300);
});
test('time math uses the user’s estimate for daily, monthly and yearly totals', async () => {
  await render(<O11 answers={{ estimatedDailyMinutes: 180 }} setAnswer={jest.fn()} />);
  expect(screen.getByLabelText('3 hours every day')).toBeTruthy();
  expect(screen.getByLabelText('90 hours a month')).toBeTruthy();
  expect(screen.getByLabelText('46 days a year')).toBeTruthy();
});
