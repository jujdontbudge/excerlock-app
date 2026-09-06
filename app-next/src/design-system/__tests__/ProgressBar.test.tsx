import { render, screen } from '@testing-library/react-native';
import { ProgressBar } from '../ProgressBar';
test.each([0, 0.5, 1])('progress %s exposes the right percentage', async (value) => {
  await render(<ProgressBar value={value} label="Daily steps" />);
  expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(value * 100);
});
