import { render, screen, userEvent } from '@testing-library/react-native';
import { FakeAppPicker } from '../FakeAppPicker';
test('generic picker searches, keeps selections across filtering and returns aggregate selection', async () => {
  const onResolve = jest.fn();
  await render(<FakeAppPicker initial={{ handle: null, appCount: 0, categoryCount: 0 }} onResolve={onResolve} />);
  await userEvent.press(screen.getByRole('checkbox', { name: 'Social' }));
  await userEvent.type(screen.getByLabelText('Search apps and categories'), 'App F');
  await userEvent.press(screen.getByRole('checkbox', { name: 'App F' }));
  await userEvent.press(screen.getByRole('button', { name: 'Done' }));
  expect(onResolve).toHaveBeenCalledWith(expect.objectContaining({ appCount: 1, categoryCount: 1 }));
});
