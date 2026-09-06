import { render, screen } from '@testing-library/react-native';
import { SettingsGroup } from '../SettingsGroup';
import { SettingsRow } from '../SettingsRow';
test('group labels are headings for assistive navigation', async () => {
  await render(
    <SettingsGroup title="Preferences">
      <SettingsRow title="Units" value="Miles" />
    </SettingsGroup>,
  );
  expect(screen.getByRole('header', { name: 'Preferences' })).toBeTruthy();
});
