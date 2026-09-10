import { useState } from 'react';
import { View } from 'react-native';
import {
  Heading,
  SettingsGroup,
  SettingsRow,
  PermissionRow,
  BottomSheet,
  ChoiceRow,
  Label,
} from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { settingsStore as useSettingsStore } from '../../state/settingsStore';
import { profileStore as useProfileStore } from '../../state/profileStore';
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
    walkPlaces = useProfileStore((state) => state.data.walkPlaces),
    runtime = useRuntime(),
    [grace, setGrace] = useState(false),
    [autoDenied, setAutoDenied] = useState(false),
    [analyticsError, setAnalyticsError] = useState(false);
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
      <SettingsGroup>
        <SettingsRow title="Usage analytics" subtitle="Help improve ExcerLock. Crash diagnostics remain enabled."
          toggle={s.analyticsEnabled} onToggle={async (enabled) => {
            useSettingsStore.getState().patch({ analyticsEnabled: enabled });
            setAnalyticsError(false);
            try { await runtime.analytics.setEnabled?.(enabled); }
            catch { setAnalyticsError(true); }
          }} />
        {analyticsError ? <Label accessibilityRole="alert">Analytics preference saved. Restart ExcerLock to finish applying it.</Label> : null}
      </SettingsGroup>
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
        <Label variant="section">{c.walkPlaces}</Label>
        {([
          ['outside', c.walkOutside],
          ['treadmill', c.walkTreadmill],
        ] as const).map(([place, title]) => (
          <ChoiceRow
            key={place}
            title={title}
            multiple
            selected={walkPlaces.includes(place)}
            onPress={() => {
              const next = walkPlaces.includes(place)
                ? walkPlaces.filter((value) => value !== place)
                : [...walkPlaces, place];
              if (next.length === 0) return;
              useProfileStore.getState().patch({ walkPlaces: next });
              runtime.analytics.track('walk_places_updated', { walk_places: next });
            }}
          />
        ))}
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
          onToggle={async (v) => {
            if (!v) {
              runtime.gym.disableAutoDetect();
              useSettingsStore.getState().patch({ gymAutoDetect: false });
              setAutoDenied(false);
              return;
            }
            const enabled = await runtime.gym.enableAutoDetect().catch(() => false);
            useSettingsStore.getState().patch({ gymAutoDetect: enabled });
            setAutoDenied(!enabled);
          }}
        />
        {autoDenied ? <Label accessibilityRole="alert" tone="secondary">{c.autoDenied}</Label> : null}
      </SettingsGroup>
      <SettingsGroup>
        <SettingsRow title={c.gyms} icon="gym" onPress={() => navigate('gyms')} />
        <SettingsRow title={c.apps} icon="lock" onPress={() => void runtime.screenTime.presentAppPicker()} />
      </SettingsGroup>
    </SettingsPage>
  );
}
