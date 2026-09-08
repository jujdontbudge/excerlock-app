import { useState } from 'react';
import { Switch, View } from 'react-native';
import { Label } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { setupCopy as c } from '../../content/setup';
import { feedback } from '../../motion/haptics';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { settingsStore as useSettingsStore } from '../../state/settingsStore';

export function AutoDetectToggle() {
  const runtime = useRuntime();
  const enabled = useSettingsStore((state) => state.data.gymAutoDetect);
  const [busy, setBusy] = useState(false);
  const change = async (value: boolean) => {
    feedback();
    if (!value) {
      runtime.gym.disableAutoDetect();
      return;
    }
    setBusy(true);
    try {
      await runtime.gym.enableAutoDetect();
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: t.space.sm }}>
      <View style={{ flexDirection: 'row', gap: t.space.lg, alignItems: 'center' }}>
        <Label style={{ flex: 1 }}>{c.autoDetect}</Label>
        <Switch
          accessibilityRole="switch"
          accessibilityLabel={c.autoDetect}
          value={enabled}
          disabled={busy}
          onValueChange={change}
          trackColor={{ true: t.brand.primary, false: t.border.default }}
        />
      </View>
      <Label variant="support" tone="secondary">
        {c.autoDetectBody}
      </Label>
    </View>
  );
}
