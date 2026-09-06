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
test('address subtitles stay readable and form one named navigation target', async () => {
  const press = jest.fn();
  await render(
    <SettingsRow title="Logan Square Fitness" subtitle="2500 N Milwaukee Ave, Chicago" onPress={press} />,
  );
  expect(screen.getByText('2500 N Milwaukee Ave, Chicago')).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Logan Square Fitness, 2500 N Milwaukee Ave, Chicago' }));
  expect(press).toHaveBeenCalledTimes(1);
});
