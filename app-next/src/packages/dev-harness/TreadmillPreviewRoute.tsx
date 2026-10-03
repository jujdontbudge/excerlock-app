import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TreadmillUnlockScreen } from '../unlock/TreadmillUnlockScreen';
import { UnlockModal } from '../unlock/UnlockModal';
import { Label, PressableScale } from '../ui';
import { tokens as t } from '../ui/tokens';

export function TreadmillPreviewRoute() {
  const router = useRouter(),
    [run, setRun] = useState(0);
  useEffect(() => {
    if (!__DEV__ || Constants.isDevice) router.replace('/');
  }, [router]);
  return (
    <UnlockModal>
      <TreadmillUnlockScreen key={run} preview />
      <ReplayButton run={run} onPress={() => setRun((count) => count + 1)} />
    </UnlockModal>
  );
}

function ReplayButton({ run, onPress }: { run: number; onPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top, left: 0, right: 0, alignItems: 'center' }}>
      <PressableScale
        label="Replay treadmill unlock"
        testID="treadmill-replay"
        haptic="select"
        onPress={onPress}
        style={{
          height: t.control.inline,
          paddingHorizontal: t.space.lg,
          justifyContent: 'center',
          borderRadius: t.radius.pill,
          borderWidth: t.stroke.selected,
          borderColor: t.border.outline,
          backgroundColor: t.surface.card,
        }}>
        <Label variant="support" style={{ color: t.text.primary }}>{run === 0 ? 'Replay' : `Replay · ${run}`}</Label>
      </PressableScale>
    </View>
  );
}
