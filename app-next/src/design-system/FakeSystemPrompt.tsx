import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens as t } from './tokens';
import { SystemAlert, type SystemAlertCopy } from './SystemAlert';
import { useMotion } from '../motion/useMotion';
import { fadeIn, fadeOut, popIn } from '../motion/presets';

/**
 * The simulator demo's stand-in for an iOS permission alert, which the fake runtime cannot raise:
 * the same alert, word for word, centred in the safe area over a dimmed screen as iOS shows it.
 * Any button but the refusal grants. It exists only in development builds on the fake runtime.
 */
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
