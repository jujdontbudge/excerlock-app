import { render, screen, userEvent } from '@testing-library/react-native';
import { ChoiceRow } from '../ChoiceRow';
test.each([false, true])('choice exposes selected=%s and responds to selection', async (selected) => {
  const choose = jest.fn();
  await render(
    <ChoiceRow
      title="Outside"
      support="A little fresh air"
      icon="walking"
      selected={selected}
      recommended
      onPress={choose}
    />,
  );
  const row = screen.getByRole('radio', { name: 'Outside' });
  expect(row.props.accessibilityState.checked).toBe(selected);
  await userEvent.press(row);
  expect(choose).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Recommended')).toBeNull();
});
