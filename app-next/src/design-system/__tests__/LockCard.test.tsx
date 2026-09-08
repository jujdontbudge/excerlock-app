import { render, screen, userEvent } from '@testing-library/react-native';
import { BlockingScheduleCard } from '../BlockingScheduleCard';
import { ProgressCard } from '../ProgressCard';
test('lock body contains live progress and keeps condition actions usable', async () => {
  const action = jest.fn();
  await render(
    <BlockingScheduleCard message="Block from 9 AM to 9 PM" start="9 AM" end="9 PM" icon="walking" lock>
      <ProgressCard
        appearance="lock"
        title="Walk"
        detail="3,200 / 5,000 steps"
        value={0.64}
        icon="walking"
        action="Start walking"
        onAction={action}
      />
    </BlockingScheduleCard>,
  );
  // Stacked condition rows grow the lock instead of being clipped by the fixed silhouette.
  expect(screen.getByTestId('lock-body')).not.toHaveStyle({ aspectRatio: 1 / 0.67 });
  expect(screen.getByText('Walk')).toHaveStyle({ color: '#FFFFFF' });
  expect(screen.getByText('3,200 / 5,000 steps')).toHaveStyle({ color: '#FFFFFF' });
  expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ min: 0, max: 100, now: 64 });
  await userEvent.press(screen.getByRole('button', { name: 'Start walking' }));
  expect(action).toHaveBeenCalledTimes(1);
});
test('an empty lock keeps the designed silhouette', async () => {
  await render(<BlockingScheduleCard message="Block from 9 AM to 9 PM" start="9 AM" end="9 PM" icon="walking" lock />);
  expect(screen.getByTestId('lock-body')).toHaveStyle({ aspectRatio: 1 / 0.67 });
});
