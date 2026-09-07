import { render, screen, userEvent } from '@testing-library/react-native';
import { CompactGroup, CompactRow } from '../CompactGroup';
import { Icon } from '../../icons/Icon';
import { tokens } from '../tokens';
jest.mock('../../icons/Icon', () => ({ Icon: jest.fn(() => null) }));
test('compact rows retain labeled actions and orange icons without decorative backplates', async () => {
  const press = jest.fn();
  await render(
    <CompactGroup title="Permissions">
      <CompactRow title="Location" icon="map-pin" value="Always" status onPress={press} />
    </CompactGroup>,
  );
  expect(screen.getByRole('header', { name: 'Permissions' })).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Location, Always' }));
  expect(press).toHaveBeenCalledTimes(1);
  for (const [props] of jest.mocked(Icon).mock.calls) expect(props.tint).toBe(tokens.brand.primary);
});
