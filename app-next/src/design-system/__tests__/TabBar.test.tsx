import { render, screen, userEvent } from '@testing-library/react-native';
import { TabBar } from '../TabBar';
test('four labelled tabs expose the active destination and navigate', async () => {
  const select = jest.fn();
  await render(<TabBar selected="home" onSelect={select} />);
  expect(screen.getAllByRole('tab')).toHaveLength(4);
  expect(screen.getByRole('tab', { name: 'Home' })).toBeSelected();
  await userEvent.press(screen.getByRole('tab', { name: 'Analytics' }));
  expect(select).toHaveBeenCalledWith('analytics');
});
