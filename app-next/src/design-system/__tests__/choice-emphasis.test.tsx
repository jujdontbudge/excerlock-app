import { render, screen } from '@testing-library/react-native';
import { ChoiceRow } from '../ChoiceRow';
import { ActivityCard } from '../ActivityCard';
import { tokens } from '../tokens';
test('solid emphasis turns a selected row orange with readable white title and support', async () => {
  await render(
    <ChoiceRow title="Outside" support="Fresh air" icon="walking" selected emphasis="solid" onPress={jest.fn()} />,
  );
  expect(screen.getByRole('radio', { name: 'Outside' })).toBeChecked();
  for (const label of ['Outside', 'Fresh air'])
    expect(screen.getByText(label)).toHaveStyle({ color: tokens.text.onAccent });
});
test('outline emphasis is the default: a selected row keeps dark text on the selected surface', async () => {
  await render(<ChoiceRow title="Miles" selected onPress={jest.fn()} />);
  expect(screen.getByRole('radio', { name: 'Miles' })).toBeChecked();
  expect(screen.getByText('Miles')).toHaveStyle({ color: tokens.text.primary });
});
test('activity cards take the same explicit emphasis', async () => {
  await render(
    <>
      <ActivityCard activity="walking" title="Walking" selected emphasis="solid" onPress={jest.fn()} />
      <ActivityCard activity="gym" title="Gym" selected onPress={jest.fn()} />
    </>,
  );
  expect(screen.getByText('Walking')).toHaveStyle({ color: tokens.text.onAccent });
  expect(screen.getByText('Gym')).toHaveStyle({ color: tokens.text.primary });
});
