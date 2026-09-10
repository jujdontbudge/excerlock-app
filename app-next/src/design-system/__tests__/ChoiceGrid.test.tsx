import { render, screen, userEvent } from '@testing-library/react-native';
import { ChoiceGrid } from '../ChoiceGrid';
test('the activity grid offers two individually selectable activities', async () => {
  const choose = jest.fn();
  await render(<ChoiceGrid selected="walking" onChange={choose} />);
  expect(screen.getAllByRole('radio')).toHaveLength(2);
  await userEvent.press(screen.getByRole('radio', { name: 'Gym' }));
  expect(choose).toHaveBeenCalledWith('gym');
});
