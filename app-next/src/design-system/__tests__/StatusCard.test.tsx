import { render, screen } from '@testing-library/react-native';
import { StatusCard } from '../StatusCard';
test.each([false, true])('status hero presents unlocked=%s and its next change', async (unlocked) => {
  await render(
    <StatusCard
      title={unlocked ? 'Apps unlocked' : 'Apps locked'}
      subtitle="Your daily plan"
      nextChange="Until 9 PM"
      unlocked={unlocked}
    />,
  );
  expect(screen.getByText('Until 9 PM')).toBeTruthy();
  expect(screen.getByRole('header')).toBeTruthy();
});
