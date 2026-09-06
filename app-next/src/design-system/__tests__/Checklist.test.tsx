import { render, screen } from '@testing-library/react-native';
import { Checklist } from '../Checklist';
test('completed facts are distinguished from pending facts', async () => {
  await render(<Checklist items={['Walking goal', 'Your schedule']} completed={1} />);
  expect(screen.getByRole('checkbox', { name: 'Walking goal' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Your schedule' })).not.toBeChecked();
});
