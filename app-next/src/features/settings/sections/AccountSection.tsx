import { useState } from 'react';
import { Label, SettingsGroup, SettingsRow } from '../../../design-system';
import { settingsCopy as c } from '../../../content/settings';
import { Reveal } from '../../../motion/Reveal';
import { useRuntime } from '../../../runtime/AppRuntimeProvider';
import { sessionStore as useSessionStore } from '../../../state/sessionStore';
import { exportUserData } from '../exportData';

export function AccountSection({ navigate }: { navigate: (path: string) => void }) {
  const runtime = useRuntime();
  const session = useSessionStore((state) => state.data.session);
  const [note, setNote] = useState('');
  const [exporting, setExporting] = useState(false);
  const exportData = async () => {
    if (exporting) return;
    setExporting(true);
    setNote('');
    try {
      await exportUserData(runtime);
    } catch {
      setNote(c.exportError);
    } finally {
      setExporting(false);
    }
  };
  return (
    <>
      <SettingsGroup title={c.account}>
        <SettingsRow
          title={c.account}
          subtitle={session.kind === 'anonymous' ? c.accountBenefit : c.signedIn(session.provider)}
          icon="person"
          onPress={() => navigate('account')}
        />
        <SettingsRow
          title={c.exportData}
          value={exporting ? c.exporting : undefined}
          icon="arrow"
          onPress={() => void exportData()}
        />
        <SettingsRow
          title={session.kind === 'anonymous' ? c.deleteData : c.delete}
          icon="trash"
          destructive
          onPress={() => navigate('account')}
        />
      </SettingsGroup>
      {note ? (
        <Reveal key={note}>
          <Label accessibilityRole="alert">{note}</Label>
        </Reveal>
      ) : null}
    </>
  );
}
