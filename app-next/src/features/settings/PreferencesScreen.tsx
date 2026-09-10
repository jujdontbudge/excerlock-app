import { useState } from 'react';
import { View } from 'react-native';
import {
  Heading,
  SettingsGroup,
  SettingsRow,
  PermissionRow,
  BottomSheet,
  ChoiceRow,
} from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { settingsStore as useSettingsStore } from '../../state/settingsStore';
import { permissionsStore as usePermissionsStore } from '../../state/permissionsStore';
import { settingsCopy as c } from '../../content/settings';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { Permissions } from '../../domain/types';
import { SettingsPage } from './SettingsPage';
import { permissionIcons } from './PermissionDetail';
const graceSeconds = [30, 60, 120, 180, 300];
export function PreferencesScreen({ navigate, onBack }: { navigate: (path: string) => void; onBack: () => void }) {
  const permissions = usePermissionsStore((s) => s.data),
    s = useSettingsStore((s) => s.data),
    runtime = useRuntime(),
    [grace, setGrace] = useState(false);
  return (
    <SettingsPage
      onBack={onBack}
      overlay={
        <BottomSheet open={grace} title={c.grace} onDismiss={() => setGrace(false)}>
          {c.graceOptions.map((label, i) => (
            <ChoiceRow
              key={label}
              title={label}
              selected={s.stopGrace === graceSeconds[i]}
              onPress={() => {
                useSettingsStore.getState().patch({ stopGrace: graceSeconds[i] });
                setGrace(false);
              }}
            />
          ))}
        </BottomSheet>
      }>
      <Heading title={c.privacyPermissions} />
      <SettingsGroup title={c.permissions}>
        <View style={{ paddingHorizontal: t.space.lg }}>
          {(Object.keys(c.permissionNames) as (keyof Permissions)[]).map((name) => (
            <PermissionRow
              key={name}
              title={c.permissionNames[name]}
              icon={permissionIcons[name]}
              status={
                ['granted', 'always', 'whenInUse'].includes(permissions[name])
                  ? 'Granted'
                  : permissions[name] === 'notDetermined'
                    ? 'Needed'
                    : 'Off'
              }
              onPress={() => navigate('permission/' + name)}
            />
          ))}
        </View>
      </SettingsGroup>
      <SettingsGroup>
        <SettingsRow
          title={c.grace}
          value={c.graceOptions[graceSeconds.indexOf(s.stopGrace)]}
          onPress={() => setGrace(true)}
        />
        <SettingsRow
          title={c.auto}
          subtitle={c.autoBody}
          toggle={s.gymAutoDetect}
          onToggle={(v) => {
            if (v) void runtime.gym.enableAutoDetect();
            else runtime.gym.disableAutoDetect();
          }}
        />
        <SettingsRow
          title={c.haptics}
          toggle={s.haptics}
          onToggle={(haptics) => useSettingsStore.getState().patch({ haptics })}
        />
      </SettingsGroup>
      <SettingsGroup>
        <SettingsRow title={c.gyms} icon="gym" onPress={() => navigate('gyms')} />
        <SettingsRow title={c.apps} icon="lock" onPress={() => void runtime.screenTime.presentAppPicker()} />
      </SettingsGroup>
    </SettingsPage>
  );
}
