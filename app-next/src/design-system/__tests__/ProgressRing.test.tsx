import { render, screen } from '@testing-library/react-native';
import { ProgressRing } from '../ProgressRing';
test.each([0, 0.75, 1])('ring %s has equivalent accessible progress', async (value) => {
  await render(<ProgressRing value={value} label="Walking goal" />);
  expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(value * 100);
});
