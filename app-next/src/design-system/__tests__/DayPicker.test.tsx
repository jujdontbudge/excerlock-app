import { render, screen, userEvent } from '@testing-library/react-native';
import { DayPicker } from '../DayPicker';
test('individual day toggles update the schedule and there are no shortcut buttons', async () => {
  const change = jest.fn();
  await render(<DayPicker days={[1, 2, 3, 4, 5]} onChange={change} />);
  await userEvent.press(screen.getByRole('checkbox', { name: 'Sat' }));
  expect(change).toHaveBeenLastCalledWith([1, 2, 3, 4, 5, 6]);
  expect(screen.queryByRole('button', { name: 'Every day' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Weekend' })).toBeNull();
});
