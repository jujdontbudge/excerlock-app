import { render, screen } from '@testing-library/react-native';
import { BarChart } from '../BarChart';
test('chart exposes direct labels for measurements and missing values', async () => {
  await render(
    <BarChart
      label="Weekly steps"
      data={[
        { label: 'Mon', value: 3200 },
        { label: 'Tue', value: null },
      ]}
    />,
  );
  expect(screen.getByLabelText('Mon: 3200')).toBeTruthy();
  expect(screen.getByLabelText('Tue: No measurement')).toBeTruthy();
});
