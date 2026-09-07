import Animated from 'react-native-reanimated';
import { Label } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { useMotion } from '../../../motion/useMotion';
import { onboardingLabels } from '../../../content/onboarding';
import { impactCopy } from '../../../content/impact';
import { impactTiming as timing } from './timing';
export function FreeTimePercentage({ hours }: { hours: number }) {
  const m = useMotion();
  const percent = Math.round((hours / onboardingLabels.freeHours) * 100);
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
      <Label variant="metric" style={{ color: t.brand.primary, textAlign: 'center' }}>
        {percent}%
      </Label>
      <Label variant="question" style={{ textAlign: 'center' }}>
        {impactCopy.percentageLabel}
      </Label>
    </Animated.View>
  );
}
