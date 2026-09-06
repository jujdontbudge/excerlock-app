import { render, screen, fireEvent, userEvent } from '@testing-library/react-native';
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
  await userEvent.press(screen.getByRole('button', { name: 'Walk 5,000 steps' }));
  expect(open).toHaveBeenCalledTimes(1);
  await fireEvent(screen.getByRole('switch'), 'valueChange', false);
  expect(toggle).toHaveBeenCalledWith(false);
});
