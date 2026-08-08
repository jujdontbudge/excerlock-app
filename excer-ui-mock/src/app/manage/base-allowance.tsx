import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { BaseAllowanceScreen } from '@/features/manage';
import { useDemo } from '@/presentation';

export default function BaseAllowanceRoute() {
  const router = useRouter();
  const { state, dispatch } = useDemo();
  const initial = state.rules.allowanceMinutes;
  const [selected, setSelected] = useState<number | 'unlimited' | null>(initial);
  const dirty = selected !== initial;

  const cancel = () => {
    if (!dirty) {
      router.back();
      return;
    }
    Alert.alert('Discard allowance change?', 'Your saved daily allowance will stay the same.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  return (
    <BaseAllowanceScreen
      onBack={cancel}
      onDone={() => {
        if (selected !== null) dispatch({ type: 'rules/set-allowance', minutes: selected });
        router.back();
      }}
      onSelect={setSelected}
      selected={selected}
    />
  );
}
