import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { RolloverScreen } from '@/features/manage';
import { useDemo } from '@/presentation';

export default function RolloverRoute() {
  const router = useRouter();
  const { state, dispatch } = useDemo();
  const [enabled, setEnabled] = useState(state.rules.rolloverEnabled);
  const [capMinutes, setCapMinutes] = useState<number | null>(
    state.rules.rolloverEnabled ? state.rules.rolloverCapMinutes : null,
  );
  const dirty = enabled !== state.rules.rolloverEnabled || (
    enabled && capMinutes !== state.rules.rolloverCapMinutes
  );
  const cancel = () => {
    if (!dirty) {
      router.back();
      return;
    }
    Alert.alert('Discard rollover changes?', 'Your saved rollover rule will stay the same.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  return (
    <RolloverScreen
      capMinutes={capMinutes}
      enabled={enabled}
      onBack={cancel}
      onDone={() => {
        dispatch({ type: 'rules/set-rollover', enabled, capMinutes: capMinutes ?? undefined });
        router.back();
      }}
      onSelectCap={setCapMinutes}
      onToggle={(next) => {
        if (next && !enabled) setCapMinutes(null);
        setEnabled(next);
      }}
    />
  );
}
