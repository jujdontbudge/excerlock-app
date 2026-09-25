import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens as t } from '../tokens';
import { SystemAlert, type SystemAlertCopy } from '../SystemAlert';
import { useMotion } from '../useMotion';
import { fadeIn, fadeOut, popIn } from '../presets';

export function FakeSystemPrompt({
  alert,
  onResolve,
}: {
  alert: SystemAlertCopy;
  onResolve: (granted: boolean) => void;
}) {
  const m = useMotion(),
    insets = useSafeAreaInsets();
  return (
    <Animated.View
      accessibilityViewIsModal
      entering={fadeIn}
      exiting={fadeOut}
      style={[
        StyleSheet.absoluteFill,
        {
          zIndex: 100,
          backgroundColor: t.surface.scrim,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}>
      <Animated.View entering={popIn(m.reduced)} exiting={fadeOut}>
        <SystemAlert alert={alert} onPress={(index) => onResolve(index !== alert.deny)} />
      </Animated.View>
    </Animated.View>
  );
}
