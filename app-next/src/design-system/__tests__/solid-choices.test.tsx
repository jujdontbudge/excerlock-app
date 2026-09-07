import { render, screen } from '@testing-library/react-native';
import { SolidChoices } from '../ChoiceAppearance';
import { ChoiceRow } from '../ChoiceRow';
import { ActivityCard } from '../ActivityCard';
import { tokens } from '../tokens';
test('onboarding row selections retain readable title and support text', async () => {
  await render(
    <SolidChoices>
      <ChoiceRow title="Outside" support="Fresh air" icon="walking" selected onPress={jest.fn()} />
    </SolidChoices>,
  );
  expect(screen.getByRole('radio', { name: 'Outside' })).toBeChecked();
  for (const label of ['Outside', 'Fresh air'])
    expect(screen.getByText(label)).toHaveStyle({ color: tokens.text.onAccent });
});
test('onboarding activity selections use the same readable selected treatment', async () => {
  await render(
    <SolidChoices>
      <ActivityCard activity="walking" title="Walking" selected onPress={jest.fn()} />
    </SolidChoices>,
  );
  expect(screen.getByRole('radio', { name: 'Walking' })).toBeChecked();
  expect(screen.getByText('Walking')).toHaveStyle({ color: tokens.text.onAccent });
});
