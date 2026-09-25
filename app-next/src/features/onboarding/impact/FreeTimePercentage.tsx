import { TextInput } from 'react-native';
import { useEffect } from 'react';
import Animated, { useAnimatedProps, useSharedValue } from 'react-native-reanimated';
import { Label } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { useMotion } from '../../../motion/useMotion';
import { onboardingLabels } from '../../../content/onboarding';
import { impactCopy } from '../../../content/impact';
import { impactTiming as timing } from './timing';
const Count = Animated.createAnimatedComponent(TextInput);
export function FreeTimePercentage({ hours }: { hours: number }) {
  const m = useMotion();
  const percent = Math.round((hours / onboardingLabels.freeHours) * 100);
  const value = useSharedValue(m.reduced ? percent : 0);
  useEffect(() => {
    value.set(m.timing(percent, 'emphasized', { stretch: 2 }));
  }, [percent, value, m]);
  const count = useAnimatedProps(() => {
    const text = `${Math.round(value.get())}%`;
    return { text, defaultValue: text };
  });
  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        gap: t.space.sm,
        animationName: m.reduced
          ? undefined
          : {
              from: { opacity: 0, transform: [{ translateY: t.space.md }] },
              to: { opacity: 1, transform: [{ translateY: 0 }] },
            },
        animationDuration: timing.fade,
        animationFillMode: 'backwards',
      }}>
      <Count
        accessibilityLabel={`${percent}%`}
        editable={false}
        pointerEvents="none"
        allowFontScaling
        maxFontSizeMultiplier={t.a11y.textScale}
        defaultValue={m.reduced ? `${percent}%` : '0%'}
        animatedProps={count}
        style={[t.type.metric, { color: t.text.primary, textAlign: 'center', padding: 0, alignSelf: 'stretch' }]}
      />
      <Label variant="display" style={{ textAlign: 'center' }}>
        {impactCopy.percentageLabel}
      </Label>
    </Animated.View>
  );
}
