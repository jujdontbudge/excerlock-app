import { render, screen, userEvent } from '@testing-library/react-native';
import { SegmentedControl } from '../SegmentedControl';
test('segments expose selection and change the selected period', async () => {
  const change = jest.fn();
  await render(<SegmentedControl options={['Week', 'Month', 'Year']} value="Week" onChange={change} />);
  expect(screen.getByRole('tab', { name: 'Week' })).toBeSelected();
  await userEvent.press(screen.getByRole('tab', { name: 'Year' }));
  expect(change).toHaveBeenCalledWith('Year');
});
