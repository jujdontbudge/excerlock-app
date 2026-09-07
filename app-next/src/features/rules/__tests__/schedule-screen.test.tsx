import { render, screen, userEvent } from '@testing-library/react-native';
import { ScheduleScreen } from '../ScheduleScreen';
import { scheduleDraft, toSchedule } from '../scheduleDraft';
import { createDraft } from '../draft';
import { RulePreviewLock } from '../RulePreviewLock';

test('rule preview keeps one canonical size with or without a schedule', async () => {
  const draft = createDraft('walking');
  const view = await render(<RulePreviewLock draft={draft} />);
  const branchStyle = screen.getByTestId('rule-preview-lock').props.style;
  await view.rerender(<RulePreviewLock draft={draft} schedule={toSchedule(scheduleDraft({}))} />);
  expect(screen.getByTestId('rule-preview-lock').props.style).toEqual(branchStyle);
});
test('schedule lock follows edited times and all-day while preserving the exercise goal', async () => {
  const props = { ruleDraft: createDraft('running'), onAction: jest.fn(), onChoose: jest.fn() };
  const view = await render(<ScheduleScreen {...props} draft={scheduleDraft({})} />);
  expect(screen.getByRole('header', { name: 'Block from 9 AM to 9 PM until you run for 20 minutes' })).toBeTruthy();
  await view.rerender(<ScheduleScreen {...props} draft={scheduleDraft({ startMinute: 600, endMinute: 1200 })} />);
  expect(screen.getByRole('header', { name: 'Block from 10 AM to 8 PM until you run for 20 minutes' })).toBeTruthy();
  await view.rerender(<ScheduleScreen {...props} draft={scheduleDraft({ allDay: true })} />);
  expect(screen.getByRole('header', { name: 'Block all day until you run for 20 minutes' })).toBeTruthy();
});
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
