import { render, screen } from '@testing-library/react-native';
import { StreakBadge } from '../StreakBadge';
test.each([0, 7])('streak %s announces its count', async (count) => {
  await render(<StreakBadge count={count} />);
  expect(screen.getByLabelText(`${count} day streak`)).toBeTruthy();
});
