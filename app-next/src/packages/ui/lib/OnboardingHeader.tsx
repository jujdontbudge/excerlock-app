import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { BackButton } from '../BackButton';
import { CloseButton } from './CloseButton';
import { tokens as t } from '../tokens';
import { controls as c } from '../controlsCopy';
import { useMotion } from '../useMotion';
export function OnboardingHeader({
  progress,
  onBack,
  onClose,
  showProgress = true,
}: {
  progress: number;
  onBack?: () => void;
  onClose?: () => void;
  showProgress?: boolean;
}) {
  const m = useMotion(),
    amount = Math.max(0, Math.min(1, progress)),
    value = useSharedValue(amount);
  useEffect(() => {
    value.set(m.timing(amount, 'standard'));
  }, [amount, value, m]);
  const fill = useAnimatedStyle(() => ({ width: `${value.get() * 100}%` }));
  return (
    <View
      style={{
        paddingHorizontal: t.layout.page,
        height: t.layout.header,
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.space.sm,
      }}>
      {onBack ? <BackButton onPress={onBack} /> : <View style={{ width: t.control.inline }} />}
      {showProgress ? <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={c.progress}
        accessibilityValue={{ min: 0, max: 100, now: amount * 100 }}
        style={{
          flex: 1,
          height: t.layout.stepBar,
          backgroundColor: t.brand.track,
          borderRadius: t.radius.pill,
          overflow: 'hidden',
        }}>
        <Animated.View
          style={[
            {
              height: '100%',
              backgroundColor: t.brand.primary,
              borderRadius: t.radius.pill,
              ...m.keyframes({ from: { opacity: 1 }, '50%': { opacity: 0.7 }, to: { opacity: 1 } }, 'breathe', {
                loop: true,
              }),
            },
            fill,
          ]}
        />
      </View> : <View style={{ flex: 1 }} />}
      {onClose ? <CloseButton onPress={onClose} /> : <View style={{ width: t.control.inline }} />}
    </View>
  );
}
