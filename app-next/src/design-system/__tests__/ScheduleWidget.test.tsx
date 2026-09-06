import { render, screen } from '@testing-library/react-native';
import { ScheduleWidget } from '../ScheduleWidget';
test.each([false, true])('schedule widget shows unlocked=%s with the same times', async (unlocked) => {
  await render(
    <ScheduleWidget
      start="9:00 AM"
      end="9:00 PM"
      status={unlocked ? 'Apps unlocked' : 'Apps locked'}
      unlocked={unlocked}
    />,
  );
  expect(screen.getByText('9:00 AM')).toBeTruthy();
  expect(screen.getByText(unlocked ? 'Apps unlocked' : 'Apps locked')).toBeTruthy();
});
