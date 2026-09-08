import { SettingsGroup, SettingsRow } from '../../../design-system';
import { settingsCopy as c } from '../../../content/settings';

export function LegalSection({ navigate }: { navigate: (path: string) => void }) {
  return (
    <SettingsGroup title={c.legal}>
      <SettingsRow title={c.terms} icon="list" onPress={() => navigate('legal/terms')} />
      <SettingsRow title={c.privacy} icon="shield" onPress={() => navigate('legal/privacy')} />
    </SettingsGroup>
  );
}
