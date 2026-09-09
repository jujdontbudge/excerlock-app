import { useState } from 'react';
import { ScreenShell, Label } from '../../design-system';
import { CompactGroup, CompactRow } from '../../design-system/CompactGroup';
import { profileStore as useProfileStore } from '../../state/profileStore';
import { settingsStore as useSettingsStore } from '../../state/settingsStore';
import { settingsCopy as c } from '../../content/settings';
import { DetailedSettingsScreen } from './DetailedSettingsScreen';
export function SettingsScreen({ navigate, onDev }: { navigate: (path: string) => void; onDev: () => void }) {
  const [more, setMore] = useState(false),
    name = useProfileStore((s) => s.data.name),
    units = useSettingsStore((s) => s.data.units);
  if (more) return <DetailedSettingsScreen navigate={navigate} onDev={onDev} onBack={() => setMore(false)} />;
  return (
    <ScreenShell dock safeBottom={false} contentStyle={{ paddingHorizontal: 20, paddingTop: 4, gap: 8 }}>
      <Label accessibilityRole="header" variant="hero" style={{ paddingHorizontal: 8 }}>
        {c.title}
      </Label>
      <CompactGroup>
        <CompactRow
          title={name || c.account}
          subtitle="Account & privacy"
          icon="person"
          onPress={() => navigate('account')}
        />
      </CompactGroup>
      <CompactGroup title="Preferences">
        <CompactRow title="Notifications" icon="bell" onPress={() => navigate('permission/notifications')} />
        <CompactRow
          title="Units"
          icon="ruler"
          value={units === 'mi' ? 'Miles' : 'Kilometers'}
          onPress={() => setMore(true)}
        />
        <CompactRow title="More preferences" icon="gear" onPress={() => setMore(true)} />
      </CompactGroup>
      <CompactGroup title="Account & support">
        <CompactRow title={c.manage} icon="lock" onPress={() => setMore(true)} />
        <CompactRow title="Help & feedback" icon="mail" onPress={() => navigate('support')} />
        <CompactRow title="Privacy & terms" icon="shield" onPress={() => setMore(true)} />
      </CompactGroup>
    </ScreenShell>
  );
}
