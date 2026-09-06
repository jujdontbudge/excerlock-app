import { render, screen, userEvent } from '@testing-library/react-native';
import { PermissionRow } from '../PermissionRow';
test.each(['Granted', 'Off', 'Needed'] as const)('permission status %s remains actionable', async (status) => {
  const press = jest.fn();
  await render(<PermissionRow title="Health" icon="heart" status={status} onPress={press} />);
  await userEvent.press(screen.getByRole('button', { name: `Health, ${status}` }));
  expect(press).toHaveBeenCalledTimes(1);
});
