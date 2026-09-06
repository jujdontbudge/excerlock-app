import { render, screen, userEvent } from '@testing-library/react-native';
import { DayPicker } from '../DayPicker';
test('weekday shortcuts and individual day toggles update the schedule', async () => {
  const change = jest.fn();
  await render(<DayPicker days={[1, 2, 3, 4, 5]} onChange={change} />);
  await userEvent.press(screen.getByRole('checkbox', { name: 'Sat' }));
  expect(change).toHaveBeenLastCalledWith([1, 2, 3, 4, 5, 6]);
  await userEvent.press(screen.getByRole('button', { name: 'Every day' }));
  expect(change).toHaveBeenLastCalledWith([1, 2, 3, 4, 5, 6, 0]);
});
