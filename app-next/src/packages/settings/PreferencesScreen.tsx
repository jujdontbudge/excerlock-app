import { ScreenTimePickerHost } from '../app-selection/ScreenTimePickerHost';
import { useState } from 'react';
import { View } from 'react-native';
import { Heading, SettingsGroup, SettingsRow, BottomSheet, ChoiceRow, Label } from '../ui';
import { notify } from '../ui/Notice';
import { settingsStore as useSettingsStore } from '../preferences/settingsStore';
import { profileStore as useProfileStore } from '../preferences/profileStore';
import { settingsCopy as c } from './lib/settingsCopy';
import { useRuntime } from '../ports/useRuntime';
import { SettingsPage } from '../ui/SettingsPage';
import { tokens as t } from '../ui/tokens';
import { useLockListPicker } from '../app-selection/useLockListPicker';
import { haptic } from '../ui/haptics';
const graceSeconds = [30, 60, 120, 180, 300];
export function PreferencesScreen({ navigate, onBack }: { navigate: (path: string) => void; onBack: () => void }) {
  const s = useSettingsStore((s) => s.data),
    walkPlaces = useProfileStore((state) => state.data.walkPlaces),
    runtime = useRuntime(),
    { open: openLockList } = useLockListPicker(),
    [grace, setGrace] = useState(false);
  return (
    <SettingsPage
      onBack={onBack}
      overlay={<>
        <ScreenTimePickerHost />
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
      </>}>
      <Heading title={c.preferences} />
      <SettingsGroup>
        <SettingsRow
          title="Usage analytics"
          toggle={s.analyticsEnabled}
          onToggle={async (enabled) => {
            useSettingsStore.getState().patch({ analyticsEnabled: enabled });
            await runtime.analytics.setEnabled?.(enabled)?.catch(() => undefined);
          }}
        />
      </SettingsGroup>
      <SettingsGroup>
        <SettingsRow
          title={c.haptics}
          subtitle={c.hapticsBody}
          toggle={s.haptics}
          onToggle={(enabled) => useSettingsStore.getState().patch({ haptics: enabled })}
        />
        {s.haptics ? (
          <SettingsRow
            title={c.hapticsPreview}
            subtitle={c.hapticsPreviewBody}
            haptic="none"
            onPress={() => haptic('unlock')}
          />
        ) : null}
      </SettingsGroup>
      <View style={{ gap: t.space.sm }}>
        <Label accessibilityRole="header" variant="section">
          {c.walkPlaces}
        </Label>
        {(
          [
            ['outside', c.walkOutside],
            ['inside', c.walkInside],
            ['treadmill', c.walkTreadmill],
          ] as const
        ).map(([place, title]) => (
          <ChoiceRow
            key={place}
            title={title}
            multiple
            selected={walkPlaces.includes(place)}
            haptic={walkPlaces.length === 1 && walkPlaces.includes(place) ? 'none' : 'select'}
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
              useSettingsStore.getState().patch({ gymAutoDetect: false, gymBackgroundAsked: true, gymAutoDetectOptOut: true });
              return;
            }
            const enabled = await runtime.gym.enableAutoDetect().catch(() => false);
            useSettingsStore.getState().patch({ gymAutoDetect: enabled, gymBackgroundAsked: true, gymAutoDetectOptOut: !enabled, locationAlwaysAsked: true });
            if (!enabled) notify(c.autoDenied);
          }}
        />
      </SettingsGroup>
      <SettingsGroup>
        <SettingsRow title={c.gyms} icon="gym" onPress={() => navigate('gyms')} />
        <SettingsRow title={c.apps} icon="lock" onPress={() => void openLockList()} />
      </SettingsGroup>
    </SettingsPage>
  );
}
