import { render, screen, userEvent, fireEvent } from '@testing-library/react-native';
import { SettingsGroup } from '../SettingsGroup';
import { SettingsRow } from '../SettingsRow';
import { tokens as t } from '../tokens';
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
test('a status dot beside the value reads green when on and muted when off', async () => {
  await render(
    <>
      <SettingsRow title="Location" value="Always" status />
      <SettingsRow title="Motion" value="Off" status={false} />
      <SettingsRow title="Units" value="Miles" />
    </>,
  );
  const dots = screen.getAllByTestId('settings-row-status');
  expect(dots).toHaveLength(2);
  expect(dots[0]).toHaveStyle({ backgroundColor: t.state.success });
  expect(dots[1]).toHaveStyle({ backgroundColor: t.border.mutedStroke });
});
