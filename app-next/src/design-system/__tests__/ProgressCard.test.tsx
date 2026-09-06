import { render, screen, userEvent } from '@testing-library/react-native';
import { ProgressCard } from '../ProgressCard';
test('an activity card exposes progress and its optional action', async () => {
  const press = jest.fn();
  await render(
    <ProgressCard
      title="Walk 5,000 steps"
      icon="walking"
      value={0.64}
      detail="1,800 steps to go"
      action="Start walk"
      onAction={press}
    />,
  );
  expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(64);
  await userEvent.press(screen.getByRole('button', { name: 'Start walk' }));
  expect(press).toHaveBeenCalledTimes(1);
});
