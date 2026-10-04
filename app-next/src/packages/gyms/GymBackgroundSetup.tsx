import { useState } from 'react';
import { View } from 'react-native';
import { BottomSheet, Label, PrimaryButton, SecondaryButton } from '../ui';
import { tokens as t } from '../ui/tokens';
import { notify } from '../ui/Notice';
import { useRuntime } from '../ports/useRuntime';
import { settingsStore as useSettingsStore } from '../preferences/settingsStore';
import { gymBackgroundCopy as c } from './gymBackgroundCopy';
export function GymBackgroundSetup({ onAnswered }: { onAnswered?: () => void }) {
  const runtime = useRuntime(), settings = useSettingsStore((s) => s.data), [busy, setBusy] = useState(false);
  const open = settings.gymPlaces.length > 0 && !settings.gymBackgroundAsked && !settings.gymAutoDetectOptOut && !settings.gymAutoDetect;
  const dismiss = () => {
    if (busy) return;
    useSettingsStore.getState().patch({ gymBackgroundAsked: true, gymAutoDetectOptOut: true });
    onAnswered?.();
  };
  const allow = async () => {
    if (busy) return;
    setBusy(true);
    try {
      useSettingsStore.getState().patch({ locationAlwaysAsked: true });
      await useSettingsStore.persistBarrier();
      const permission = await runtime.gym.requestBackgroundLocation();
      const enabled = permission === 'always' && await runtime.gym.enableAutoDetect();
      useSettingsStore.getState().patch({ gymBackgroundAsked: true, gymAutoDetectOptOut: !enabled, gymAutoDetect: enabled });
      await useSettingsStore.persistBarrier();
      if (!enabled) notify(c.foregroundOnly);
      onAnswered?.();
    } catch { notify(c.retry); }
    finally { setBusy(false); }
  };
  return <BottomSheet open={open} title={c.title} onDismiss={dismiss} footer={<View style={{ gap: t.space.sm }}>
    <PrimaryButton label={c.allow} loading={busy} onPress={() => void allow()} />
    <SecondaryButton label={c.manual} disabled={busy} onPress={dismiss} />
  </View>}><Label>{c.body}</Label></BottomSheet>;
}
