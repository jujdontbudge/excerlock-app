import { render, screen } from '@testing-library/react-native';
import { PlanTrialPreview } from '../PlanTrialPreview';

test('renders the selected condition inside a realistic ExcerLock phone preview', async () => {
  await render(<PlanTrialPreview condition="Walk 10,000 steps to unlock your apps" />);
  expect(screen.getByRole('header', { name: 'We want you to try ExcerLock Premium for free' })).toBeTruthy();
  expect(screen.getByLabelText('ExcerLock phone preview')).toBeTruthy();
  expect(screen.getByText('Walk 10,000 steps to unlock your apps')).toBeTruthy();
  expect(screen.queryByText(/yearly for free/i)).toBeNull();
});
