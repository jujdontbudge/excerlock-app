import { Heading, SettingsGroup, SettingsRow } from '../../design-system';
import { settingsCopy as c } from '../../content/settings';
import { SettingsPage } from './SettingsPage';
export function LegalHubScreen({ navigate, onBack }: { navigate: (path: string) => void; onBack: () => void }) {
  return (
    <SettingsPage onBack={onBack}>
      <Heading title={c.legalHub} support={c.legalDescription} />
      <SettingsGroup>
        <SettingsRow title={c.privacy} icon="shield" onPress={() => navigate('legal/privacy')} />
        <SettingsRow title={c.terms} icon="list" onPress={() => navigate('legal/terms')} />
      </SettingsGroup>
    </SettingsPage>
  );
}
