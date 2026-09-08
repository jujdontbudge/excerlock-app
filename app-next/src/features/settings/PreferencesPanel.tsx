import { useRef, useState } from 'react';
import { Switch, View } from 'react-native';
import {
  BottomSheet,
  ChoiceRow,
  Label,
  PressableScale,
  SegmentedControl,
  SettingsGroup,
  SettingsRow,
} from '../../design-system';
import { settingsCopy as c } from '../../content/settings';
import { tokens as t } from '../../design-system/tokens';
import { feedback } from '../../motion/haptics';
import { Reveal } from '../../motion/Reveal';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { settingsStore as useSettingsStore } from '../../state/settingsStore';
import { setUnits } from './preferences';

const graceValues = [30, 60, 120, 180, 300];

export function Preferences({ navigate }: { navigate: (path: string) => void }) {
  const settings = useSettingsStore((s) => s.data);
  const runtime = useRuntime();
  const [unitsError, setUnitsError] = useState(false);
  const [autoDenied, setAutoDenied] = useState(false);
  const [autoBusy, setAutoBusy] = useState(false);
  const autoBusyRef = useRef(false);
  const [graceOpen, setGraceOpen] = useState(false);

  const toggleAutoDetect = async (enabled: boolean) => {
    if (autoBusyRef.current) return;
    if (!enabled) {
      runtime.gym.disableAutoDetect();
      useSettingsStore.getState().patch({ gymAutoDetect: false });
      setAutoDenied(false);
      return;
    }
    autoBusyRef.current = true;
    setAutoBusy(true);
    try {
      const granted = await runtime.gym.enableAutoDetect();
      useSettingsStore.getState().patch({ gymAutoDetect: granted });
      setAutoDenied(!granted);
    } finally {
      autoBusyRef.current = false;
      setAutoBusy(false);
    }
  };

  return (
    <>
      <BottomSheet open={graceOpen} title={c.grace} onDismiss={() => setGraceOpen(false)}>
        {c.graceOptions.map((label, index) => (
          <ChoiceRow
            key={label}
            title={label}
            selected={settings.stopGrace === graceValues[index]}
            onPress={() => {
              useSettingsStore.getState().patch({ stopGrace: graceValues[index] });
              setGraceOpen(false);
            }}
          />
        ))}
      </BottomSheet>
      <SettingsGroup title={c.preferences}>
        <View style={{ padding: t.space.lg, gap: t.space.lg }}>
          <Label>{c.units}</Label>
          <SegmentedControl
            options={['km', 'mi']}
            value={settings.units}
            onChange={(units) => {
              try {
                setUnits(units as 'km' | 'mi');
                setUnitsError(false);
              } catch {
                setUnitsError(true);
              }
            }}
          />
          {unitsError ? (
            <Reveal>
              <Label accessibilityRole="alert">{c.unitsError}</Label>
            </Reveal>
          ) : null}
          <SettingsRow
            title={c.grace}
            value={c.graceOptions[graceValues.indexOf(settings.stopGrace)]}
            onPress={() => setGraceOpen(true)}
          />
          <Label variant="support" tone="secondary">
            {c.graceBody}
          </Label>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md }}>
            <Label style={{ flex: 1 }}>{c.auto}</Label>
            <Switch
              accessibilityRole="switch"
              accessibilityLabel={c.auto}
              accessibilityState={{ busy: autoBusy }}
              disabled={autoBusy}
              value={settings.gymAutoDetect}
              trackColor={{ true: t.brand.primary }}
              onValueChange={(enabled) => void toggleAutoDetect(enabled)}
            />
          </View>
          <Label variant="support" tone="secondary">
            {c.autoBody}
          </Label>
          {autoDenied ? (
            <Reveal style={{ gap: t.space.sm }}>
              <Label accessibilityRole="alert" variant="support">
                {c.autoDenied}
              </Label>
              <PressableScale label={c.autoDeniedAction} onPress={() => navigate('permission/location')}>
                <Label style={{ color: t.brand.primary }}>{c.autoDeniedAction}</Label>
              </PressableScale>
            </Reveal>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md }}>
            <Label style={{ flex: 1 }}>{c.haptics}</Label>
            <Switch
              accessibilityRole="switch"
              accessibilityLabel={c.haptics}
              value={settings.haptics}
              trackColor={{ true: t.brand.primary }}
              onValueChange={(enabled) => {
                useSettingsStore.getState().patch({ haptics: enabled });
                if (enabled) feedback();
              }}
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md }}>
            <Label style={{ flex: 1 }}>{c.shareAnalytics}</Label>
            <Switch
              accessibilityRole="switch"
              accessibilityLabel={c.shareAnalytics}
              value={settings.shareAnalytics}
              trackColor={{ true: t.brand.primary }}
              onValueChange={(enabled) => useSettingsStore.getState().patch({ shareAnalytics: enabled })}
            />
          </View>
          <Label variant="support" tone="secondary">
            {c.shareAnalyticsBody}
          </Label>
        </View>
      </SettingsGroup>
    </>
  );
}
