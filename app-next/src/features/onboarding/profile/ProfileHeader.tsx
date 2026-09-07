import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { PressableScale } from '../../../design-system';
import { Icon } from '../../../icons/Icon';
import { tokens as t } from '../../../design-system/tokens';
import { profileTokens as p } from '../../../design-system/profileTokens';
import { controls as c } from '../../../content/controls';
import { useMotion } from '../../../motion/useMotion';
export function ProfileHeader({ step, progress, onBack }: { step: string; progress: number; onBack: () => void }) {
  const inline = step === 'O05',
    m = useMotion(),
    value = useSharedValue(progress);
  useEffect(() => {
    value.set(withTiming(progress, { duration: m.duration.standard }));
  }, [progress, value, m.duration.standard]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(1, value.get())) * 100}%` }));
  return (
    <View
      style={{
        paddingHorizontal: t.layout.page,
        height: inline ? p.header.inlineHeight : step === 'O04' ? p.header.nameHeight : p.header.stackHeight,
        flexDirection: inline ? 'row' : 'column',
        gap: inline ? t.space.sm : 0,
        justifyContent: 'space-between',
      }}>
      <PressableScale label={c.back} onPress={onBack} style={{ width: t.layout.touch, justifyContent: 'center' }}>
        <Icon name="back" variant="utility" tint={t.brand.primary} size={t.layout.glyph} />
      </PressableScale>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={c.progress}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
        style={{
          flex: inline ? 1 : undefined,
          alignSelf: inline ? 'center' : undefined,
          height: p.header.bar,
          backgroundColor: p.colors.track,
          borderRadius: t.radius.pill,
          overflow: 'hidden',
        }}>
        <Animated.View
          style={[
            {
              height: '100%',
              backgroundColor: t.brand.primary,
              borderRadius: t.radius.pill,
              animationName: m.reduced
                ? undefined
                : { from: { opacity: 1 }, '50%': { opacity: 0.6 }, to: { opacity: 1 } },
              animationDuration: m.duration.breathe,
              animationIterationCount: 'infinite',
              animationTimingFunction: 'ease-in-out',
            },
            fill,
          ]}
        />
      </View>
    </View>
  );
}
