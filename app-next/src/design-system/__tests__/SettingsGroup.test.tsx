import { render, screen } from '@testing-library/react-native';
import { SettingsGroup } from '../SettingsGroup';
import { SettingsRow } from '../SettingsRow';
import { tokens as t } from '../tokens';
test('group labels are headings for assistive navigation', async () => {
  await render(
    <SettingsGroup title="Preferences">
      <SettingsRow title="Units" value="Miles" />
    </SettingsGroup>,
  );
  expect(screen.getByRole('header', { name: 'Preferences' })).toBeTruthy();
});
test('an outline group sits on the translucent card; the default group is the white card', async () => {
  await render(
    <>
      <SettingsGroup outline><SettingsRow title="Units" value="Miles" /></SettingsGroup>
      <SettingsGroup><SettingsRow title="Haptics" value="On" /></SettingsGroup>
    </>,
  );
  const [outlined, plain] = screen.getAllByTestId('settings-group-card');
  expect(outlined).toHaveStyle({ backgroundColor: t.surface.glass, borderColor: t.border.outline });
  expect(plain).toHaveStyle({ backgroundColor: t.surface.card });
});
