import { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { PressableScale } from './PressableScale';
import { CloseButton } from './CloseButton';
import { tokens as t } from './tokens';
import { profileTokens as p } from './profileTokens';
import { paths } from '../icons/paths';
import { controls as c } from '../content/controls';
import { useMotion } from '../motion/useMotion';
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
    value.set(m.reduced ? amount : withTiming(amount, { duration: m.duration.standard }));
  }, [amount, value, m.reduced, m.duration.standard]);
  const fill = useAnimatedStyle(() => ({ width: `${value.get() * 100}%` }));
  const arrow = (name: 'back') => (
    <Svg accessible={false} width={p.header.arrow} height={p.header.arrow} viewBox="0 0 24 24">
      <Path
        d={paths[name]}
        fill="none"
        stroke={t.brand.primary}
        strokeWidth={p.header.arrowStroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
  return (
    <View
      style={{
        paddingHorizontal: t.layout.page,
        height: p.header.height,
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.space.sm,
      }}>
      <PressableScale
        label={c.back}
        disabled={!onBack}
        accessibilityState={{ disabled: !onBack }}
        onPress={onBack}
        style={{ width: t.layout.touch, alignItems: 'center', opacity: onBack ? 1 : 0 }}>
        {arrow('back')}
      </PressableScale>
      {showProgress ? <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={c.progress}
        accessibilityValue={{ min: 0, max: 100, now: amount * 100 }}
        style={{
          flex: 1,
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
                : { from: { opacity: 1 }, '50%': { opacity: 0.7 }, to: { opacity: 1 } },
              animationDuration: m.duration.breathe,
              animationIterationCount: 'infinite',
              animationTimingFunction: 'ease-in-out',
            },
            fill,
          ]}
        />
      </View> : <View style={{ flex: 1 }} />}
      {onClose ? <CloseButton onPress={onClose} /> : null}
    </View>
  );
}
