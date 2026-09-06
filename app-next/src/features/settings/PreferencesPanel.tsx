import { useState } from 'react';
import { Reveal } from '../../motion/Reveal';
import { View, Switch } from 'react-native';
import { Label, SegmentedControl, SettingsRow, SettingsGroup } from '../../design-system';
import { settingsStore as useSettingsStore } from '../../state/settingsStore';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { settingsCopy as c } from '../../content/settings';
import { tokens as t } from '../../design-system/tokens';
import { feedback } from '../../motion/haptics';
import { setUnits } from './preferences';
export function Preferences({ onGrace }: { onGrace: () => void }) {
  const s = useSettingsStore((s) => s.data),
    runtime = useRuntime(),
    [error, setError] = useState(false);
  return (
    <SettingsGroup title={c.preferences}>
      <View style={{ padding: t.space.lg, gap: t.space.lg }}>
        <Label>{c.units}</Label>
        <SegmentedControl
          options={['km', 'mi']}
          value={s.units}
          onChange={(u) => {
            try {
              setUnits(u as 'km' | 'mi');
              setError(false);
            } catch {
              setError(true);
            }
          }}
        />
        {error ? (
          <Reveal>
            <Label accessibilityRole="alert">{c.unitsError}</Label>
          </Reveal>
        ) : null}
        <SettingsRow
          title={c.grace}
          value={c.graceOptions[[30, 60, 120, 180, 300].indexOf(s.stopGrace)]}
          onPress={onGrace}
        />
        <Label variant="support" tone="secondary">
          {c.graceBody}
        </Label>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md }}>
          <Label style={{ flex: 1 }}>{c.auto}</Label>
          <Switch
            accessibilityRole="switch"
            accessibilityLabel={c.auto}
            value={s.gymAutoDetect}
            trackColor={{ true: t.brand.primary }}
            onValueChange={(v) => {
              feedback();
              if (v) void runtime.gym.enableAutoDetect();
              else runtime.gym.disableAutoDetect();
            }}
          />
        </View>
        <Label variant="support" tone="secondary">
          {c.autoBody}
        </Label>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md }}>
          <Label style={{ flex: 1 }}>{c.haptics}</Label>
          <Switch
            accessibilityRole="switch"
            accessibilityLabel={c.haptics}
            value={s.haptics}
            trackColor={{ true: t.brand.primary }}
            onValueChange={(haptics) => {
              feedback();
              useSettingsStore.getState().patch({ haptics });
            }}
          />
        </View>
      </View>
    </SettingsGroup>
  );
}
