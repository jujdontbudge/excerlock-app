import { useState } from 'react';
import { Switch, View } from 'react-native';
import { Heading, Label, PrimaryButton, SecondaryButton } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
import { setupCopy as c } from '../../content/setup';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { settingsStore as useSettingsStore } from '../../state/settingsStore';
import { permissionsStore as usePermissionsStore } from '../../state/permissionsStore';
import { feedback } from '../../motion/haptics';
export function GymSetup({ onContinue, onChoose }: { onContinue: () => void; onChoose: () => void }) {
  const runtime = useRuntime(),
    settings = useSettingsStore((s) => s.data),
    location = usePermissionsStore((s) => s.data.location),
    [busy, setBusy] = useState(false),
    [note, setNote] = useState(false);
  const granted = location === 'whenInUse' || location === 'always';
  const request = async () => {
    setBusy(true);
    try {
      await runtime.gym.requestLocation();
    } finally {
      setBusy(false);
    }
  };
  const auto = async (value: boolean) => {
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
    <>
      <Heading title={c.gymTitle} support={c.gymBody} />
      <LivingIcon name="gym" />
      {settings.gymPlaces.map((p, index) => (
        <Reveal key={p.id} index={index}>
          <Label>{p.name}</Label>
        </Reveal>
      ))}
      <SecondaryButton label={c.chooseGym} onPress={onChoose} />
      {location === 'denied' ? (
        <Reveal>
          <Label tone="secondary">{c.locationDenied}</Label>
          <SecondaryButton label={c.settings} onPress={() => setNote(true)} />
        </Reveal>
      ) : !granted ? (
        <PrimaryButton label={c.locationAllow} loading={busy} onPress={request} />
      ) : (
        <Reveal>
          <Label style={{ color: t.state.success }}>{c.granted}</Label>
        </Reveal>
      )}
      {note ? (
        <Reveal>
          <Label tone="secondary">{c.settingsNote}</Label>
        </Reveal>
      ) : null}
      {granted ? (
        <Reveal style={{ gap: t.space.sm }}>
          <View style={{ flexDirection: 'row', gap: t.space.lg, alignItems: 'center' }}>
            <Label style={{ flex: 1 }}>{c.autoDetect}</Label>
            <Switch
              accessibilityLabel={c.autoDetect}
              value={settings.gymAutoDetect}
              disabled={busy}
              onValueChange={auto}
              trackColor={{ true: t.brand.primary, false: t.border.default }}
            />
          </View>
          <Label variant="support" tone="secondary">
            {c.autoDetectBody}
          </Label>
        </Reveal>
      ) : null}
      <View style={{ flexGrow: 1 }} />
      <PrimaryButton label={c.continue} disabled={busy} onPress={onContinue} />
    </>
  );
}
