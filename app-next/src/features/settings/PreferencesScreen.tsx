import { useState } from 'react';
import { View } from 'react-native';
import { Heading, SettingsGroup, SettingsRow, BottomSheet, ChoiceRow, Label } from '../../design-system';
import { settingsStore as useSettingsStore } from '../../state/settingsStore';
import { profileStore as useProfileStore } from '../../state/profileStore';
import { settingsCopy as c } from '../../content/settings';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { SettingsPage } from './SettingsPage';
import { tokens as t } from '../../design-system/tokens';
import { useLockListPicker } from '../permissions/useLockListPicker';
const graceSeconds = [30, 60, 120, 180, 300];
export function PreferencesScreen({ navigate, onBack }: { navigate: (path: string) => void; onBack: () => void }) {
  const s = useSettingsStore((s) => s.data),
    walkPlaces = useProfileStore((state) => state.data.walkPlaces),
    runtime = useRuntime(),
    { open: openLockList } = useLockListPicker(),
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
      <Heading title={c.preferences} />
      <SettingsGroup>
        <SettingsRow
          title="Usage analytics"
          toggle={s.analyticsEnabled}
          onToggle={async (enabled) => {
            useSettingsStore.getState().patch({ analyticsEnabled: enabled });
            setAnalyticsError(false);
            try {
              await runtime.analytics.setEnabled?.(enabled);
            } catch {
              setAnalyticsError(true);
            }
          }}
        />
        {analyticsError ? (
          <Label accessibilityRole="alert">Analytics preference saved. Restart ExcerLock to finish applying it.</Label>
        ) : null}
      </SettingsGroup>
      <View style={{ gap: t.space.sm }}>
        <Label accessibilityRole="header" variant="section">
          {c.walkPlaces}
        </Label>
        {(
          [
            ['outside', c.walkOutside],
            ['treadmill', c.walkTreadmill],
          ] as const
        ).map(([place, title]) => (
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
      </View>
      <SettingsGroup>
        <SettingsRow
          title={c.grace}
          value={c.graceOptions[graceSeconds.indexOf(s.stopGrace)]}
          onPress={() => setGrace(true)}
        />
        <SettingsRow
          title={c.auto}
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
        {autoDenied ? (
          <Label accessibilityRole="alert" tone="secondary">
            {c.autoDenied}
          </Label>
        ) : null}
      </SettingsGroup>
      <SettingsGroup>
        <SettingsRow title={c.gyms} icon="gym" onPress={() => navigate('gyms')} />
        <SettingsRow title={c.apps} icon="lock" onPress={() => void openLockList()} />
      </SettingsGroup>
    </SettingsPage>
  );
}
