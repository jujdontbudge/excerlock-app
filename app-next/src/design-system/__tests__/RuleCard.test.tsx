import { render, screen, userEvent } from '@testing-library/react-native';
import { RuleCard } from '../RuleCard';
test('rules can be opened and paused independently', async () => {
  const open = jest.fn(),
    toggle = jest.fn();
  await render(
    <RuleCard
      title="Walk 5,000 steps"
      schedule="Mon–Fri · 9 AM–9 PM"
      icon="walking"
      enabled
      onOpen={open}
      onToggle={toggle}
      onDelete={jest.fn()}
    />,
  );
  expect(screen.getByLabelText('Active condition')).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'More actions for Walk 5,000 steps' }));
  await userEvent.press(screen.getByRole('button', { name: 'Turn off' }));
  expect(toggle).toHaveBeenCalledWith(false);

  await userEvent.press(screen.getByRole('button', { name: 'More actions for Walk 5,000 steps' }));
  await userEvent.press(screen.getByRole('button', { name: 'Edit condition' }));
  expect(open).toHaveBeenCalledTimes(1);
});
