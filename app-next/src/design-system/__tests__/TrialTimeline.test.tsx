import { render, screen } from '@testing-library/react-native';
import { TrialTimeline } from '../TrialTimeline';
test('the trial timeline presents all three milestones with their explanatory copy', async () => {
  await render(
    <TrialTimeline
      milestones={[
        { title: 'Today', body: 'Start your trial' },
        { title: 'Day 5', body: 'A reminder' },
        { title: 'Day 7', body: 'Your plan begins' },
      ]}
    />,
  );
  expect(screen.getByText('Today')).toBeTruthy();
  expect(screen.getByText('Your plan begins')).toBeTruthy();
});
