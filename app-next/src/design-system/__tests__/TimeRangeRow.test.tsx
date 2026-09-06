import { render, screen, fireEvent, userEvent } from '@testing-library/react-native';
import { TimeRangeRow } from '../TimeRangeRow';
test('time controls open their editor and all-day toggles collapse the times', async () => {
  const choose = jest.fn(),
    all = jest.fn();
  await render(<TimeRangeRow start="9:00 AM" end="9:00 PM" allDay={false} onAllDay={all} onChoose={choose} />);
  await userEvent.press(screen.getByRole('button', { name: 'Start time: 9:00 AM' }));
  expect(choose).toHaveBeenCalledWith('start');
  await fireEvent(screen.getByRole('switch', { name: 'All day' }), 'valueChange', true);
  expect(all).toHaveBeenCalledWith(true);
});
