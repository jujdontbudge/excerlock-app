import { render, screen } from '@testing-library/react-native';
import { StatusCard } from '../StatusCard';
import { tokens as t } from '../tokens';
test.each([false, true])('orange status keeps readable text for unlocked=%s', async (unlocked) => {
  await render(
    <StatusCard
      appearance="orange"
      title="Apps status"
      subtitle="Your daily plan"
      nextChange="Until 9 PM"
      unlocked={unlocked}
    />,
  );
  for (const text of ['Apps status', 'Your daily plan', 'Until 9 PM']) {
    expect(screen.getByText(text)).toHaveStyle({ color: t.text.onAccent });
  }
});
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
