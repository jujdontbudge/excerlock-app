import { render, screen, userEvent } from '@testing-library/react-native';
import { ScheduleScreen } from '../ScheduleScreen';
import { scheduleDraft } from '../scheduleDraft';
test('schedule errors and live cross-midnight label are rendered', async () => {
  const onAction = jest.fn(),
    onChoose = jest.fn();
  const r = await render(
    <ScheduleScreen draft={{ ...scheduleDraft({}), days: [], end: 550 }} onAction={onAction} onChoose={onChoose} />,
  );
  expect(screen.getByText('Choose at least one day.')).toBeTruthy();
  expect(screen.getByText('Choose a window of at least 15 minutes.')).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Every day' }));
  expect(onAction).toHaveBeenCalledWith({ type: 'days', value: [1, 2, 3, 4, 5, 6, 0] });
  await r.rerender(
    <ScheduleScreen draft={{ ...scheduleDraft({}), start: 1200, end: 120 }} onAction={onAction} onChoose={onChoose} />,
  );
  expect(screen.getByText('Mon–Fri · 8 PM–2 AM, ends next day')).toBeTruthy();
});
