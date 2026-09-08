import { SettingsGroup, SettingsRow } from '../../../design-system';
import { settingsCopy as c } from '../../../content/settings';
import { sessionStore as useSessionStore } from '../../../state/sessionStore';

export function AccountSection({ navigate }: { navigate: (path: string) => void }) {
  const session = useSessionStore((state) => state.data.session);
  return (
    <SettingsGroup title={c.account}>
      <SettingsRow
        title={c.account}
        subtitle={session.kind === 'anonymous' ? c.accountBenefit : c.signedIn(session.provider)}
        icon="person"
        onPress={() => navigate('account')}
      />
      <SettingsRow
        title={session.kind === 'anonymous' ? c.deleteData : c.delete}
        icon="trash"
        destructive
        onPress={() => navigate('account')}
      />
    </SettingsGroup>
  );
}
