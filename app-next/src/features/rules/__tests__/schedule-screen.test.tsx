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
test('schedule controls follow edited times and all-day without a decorative lock', async () => {
  const props = { ruleDraft: createDraft('running'), onAction: jest.fn(), onChoose: jest.fn() };
  const view = await render(<ScheduleScreen {...props} draft={scheduleDraft({})} />);
  expect(screen.queryByTestId('rule-preview-lock')).toBeNull();
  expect(screen.getByRole('button', { name: /Start at: 9.AM/ })).toBeTruthy();
  await view.rerender(<ScheduleScreen {...props} draft={scheduleDraft({ startMinute: 600, endMinute: 1200 })} />);
  expect(screen.queryByTestId('rule-preview-lock')).toBeNull();
  expect(screen.getByRole('button', { name: /Start at: 10.AM/ })).toBeTruthy();
  await view.rerender(<ScheduleScreen {...props} draft={scheduleDraft({ allDay: true })} />);
  expect(screen.queryByTestId('rule-preview-lock')).toBeNull();
  expect(screen.getByRole('switch', { name: 'All day' })).toHaveProp('value', true);
});
test('schedule errors and live cross-midnight label are rendered', async () => {
  const onAction = jest.fn(),
    onChoose = jest.fn();
  const r = await render(
    <ScheduleScreen draft={{ ...scheduleDraft({}), days: [], end: 550 }} onAction={onAction} onChoose={onChoose} />,
  );
  expect(screen.getByText('Choose at least one day.')).toBeTruthy();
  expect(screen.getByText('Choose a window of at least 15 minutes.')).toBeTruthy();
  for (const name of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) {
    await userEvent.press(screen.getByRole('checkbox', { name }));
  }
  expect(onAction).toHaveBeenCalled();
  await r.rerender(
    <ScheduleScreen draft={{ ...scheduleDraft({}), start: 1200, end: 120 }} onAction={onAction} onChoose={onChoose} />,
  );
  expect(screen.getByText('Mon–Fri · 8 PM–2 AM, ends next day')).toBeTruthy();
});
