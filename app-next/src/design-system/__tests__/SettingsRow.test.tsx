import { render, screen, userEvent, fireEvent } from '@testing-library/react-native';
import { SettingsGroup } from '../SettingsGroup';
import { SettingsRow } from '../SettingsRow';
test('group rows support navigation and independent native switches', async () => {
  const press = jest.fn(),
    toggle = jest.fn();
  await render(
    <SettingsGroup title="Preferences">
      <SettingsRow title="Units" icon="ruler" value="Miles" onPress={press} />
      <SettingsRow title="Haptics" icon="bell" toggle onToggle={toggle} />
    </SettingsGroup>,
  );
  await userEvent.press(screen.getByRole('button', { name: 'Units, Miles' }));
  expect(press).toHaveBeenCalledTimes(1);
  await fireEvent(screen.getByRole('switch', { name: 'Haptics' }), 'valueChange', false);
  expect(toggle).toHaveBeenCalledWith(false);
});
