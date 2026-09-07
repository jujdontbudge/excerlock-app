import { useState } from 'react';
import { ScreenShell, Label, PressableScale } from '../../design-system';
import { CompactGroup, CompactRow } from '../../design-system/CompactGroup';
import { tokens as t } from '../../design-system/tokens';
import { profileStore as useProfileStore } from '../../state/profileStore';
import { permissionsStore as usePermissionsStore } from '../../state/permissionsStore';
import { settingsStore as useSettingsStore } from '../../state/settingsStore';
import { settingsCopy as c } from '../../content/settings';
import { permissionIcons } from './PermissionDetail';
import { DetailedSettingsScreen } from './DetailedSettingsScreen';
import { Permissions } from '../../domain/types';
const permissionOrder: (keyof Permissions)[] = ['screenTime', 'motion', 'health', 'location', 'notifications'];
export function SettingsScreen({ navigate, onDev }: { navigate: (path: string) => void; onDev: () => void }) {
  const [more, setMore] = useState(false),
    name = useProfileStore((s) => s.data.name),
    permissions = usePermissionsStore((s) => s.data),
    units = useSettingsStore((s) => s.data.units);
  if (more) return <DetailedSettingsScreen navigate={navigate} onDev={onDev} onBack={() => setMore(false)} />;
  return (
    <ScreenShell safeBottom={false} contentStyle={{ paddingHorizontal: 20, paddingTop: 4, gap: 8 }}>
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
      <CompactGroup title="Permissions">
        {permissionOrder.map((key) => {
          const state = permissions[key],
            granted = ['granted', 'always', 'whenInUse'].includes(state);
          const value =
            state === 'always'
              ? 'Always'
              : state === 'whenInUse'
                ? 'While using'
                : granted
                  ? 'Connected'
                  : state === 'notDetermined'
                    ? 'Not requested'
                    : c.statuses[state];
          return (
            <CompactRow
              key={key}
              title={key === 'health' ? 'Apple Health' : c.permissionNames[key]}
              icon={permissionIcons[key]}
              value={value}
              status={granted}
              onPress={() => navigate('permission/' + key)}
            />
          );
        })}
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
      <PressableScale
        label="More settings"
        onPress={() => setMore(true)}
        style={{ minHeight: 44, justifyContent: 'center' }}>
        <Label variant="support" style={{ color: t.brand.primary, textAlign: 'center' }}>
          More settings
        </Label>
      </PressableScale>
    </ScreenShell>
  );
}
