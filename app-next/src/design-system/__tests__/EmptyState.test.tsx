import { render, screen, userEvent } from '@testing-library/react-native';
import { EmptyState } from '../EmptyState';
test('empty state explains the state and offers its next action', async () => {
  const press = jest.fn();
  await render(
    <EmptyState
      icon="list"
      title="Your first condition"
      body="Choose how you want to move"
      action="Add condition"
      onAction={press}
    />,
  );
  expect(screen.getByText('Choose how you want to move')).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Add condition' }));
  expect(press).toHaveBeenCalledTimes(1);
});
