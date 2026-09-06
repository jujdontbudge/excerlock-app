import { render, screen } from '@testing-library/react-native';
import { LineChart } from '../LineChart';
test('line chart keeps its meaning available without seeing the path', async () => {
  await render(<LineChart label="Screen time trend" values={[5, 4, 3, 2]} startLabel="Now" endLabel="Your goal" />);
  expect(screen.getByLabelText('Screen time trend')).toBeTruthy();
  expect(screen.getByText('Your goal')).toBeTruthy();
});
