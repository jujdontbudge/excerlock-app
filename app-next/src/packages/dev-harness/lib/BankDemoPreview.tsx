import { useMemo } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BankConditionDemo, BankRuleMode } from '../../onboarding/BankConditionDemo';
import { tokens as t } from '../../ui/tokens';

export function BankDemoPreview({ activity, cast }: { activity?: string; cast?: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mode = useMemo<BankRuleMode>(
    () => ({ kind: 'bank', activity: activity === 'gym' ? 'gym' : 'walking', difficulty: 'medium' }),
    [activity],
  );
  return (
    <View style={{ flex: 1, backgroundColor: t.surface.warmCanvas, paddingBottom: insets.bottom + t.control.full + t.space.xl }}>
      <BankConditionDemo mode={mode} cast={cast === 'girl' ? 'girl' : 'boy'} onBack={() => router.replace('/dev')} onReady={() => undefined} />
    </View>
  );
}
