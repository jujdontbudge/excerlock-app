import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Heading, Label } from '../../../ui';
import { tokens as t } from '../../../ui/tokens';
import { TickingNumber } from '../../../ui/TickingNumber';
import { useMotion } from '../../../ui/useMotion';
import { Icon } from '../../../ui/Icon';
import { onboardingCopy, onboardingLabels as c } from '../onboardingCopy';
import { impactCopy } from '../impactCopy';
import { impactTiming as timing } from '../impact/timing';
import { impactSummary } from '../../model';
import { AnswerProps } from '../types';
export function O11({ answers }: AnswerProps) {
  const summary = impactSummary(Number(answers.estimatedDailyMinutes ?? 180)),
    m = useMotion();
  return (
    <>
      <Heading title={onboardingCopy.O11.title} centered />
      <View
        style={{
          borderRadius: t.radius.card,
          borderWidth: t.stroke.hairline,
          borderColor: t.border.outline,
          backgroundColor: t.surface.card,
          padding: t.space.xl,
          gap: t.space.lg,
        }}>
        {[
          { value: summary.hours, label: c.daily },
          { value: summary.month, label: c.month },
          { value: summary.days, label: c.year },
        ].map((item, index) => (
          <Animated.View
            key={item.label}
            style={{
              animationName: m.reduced
                ? undefined
                : {
                    from: { opacity: 0, transform: [{ translateY: t.space.md }] },
                    to: { opacity: 1, transform: [{ translateY: 0 }] },
                  },
              animationDuration: timing.fade,
              animationDelay: index * timing.metric,
              animationFillMode: 'backwards',
              gap: t.space.md,
              alignItems: 'center',
            }}>
            {index > 0 ? (
              <View style={{ transform: [{ rotate: '90deg' }] }}>
                <Icon name="arrow" size={t.icon.md} />
              </View>
            ) : null}
            <TickingNumber
              precision={index === 0 ? 1 : 0}
              value={item.value}
              label={item.label}
              delay={index * timing.metric}
            />
          </Animated.View>
        ))}
      </View>
      <Animated.View
        style={{
          animationName: m.reduced ? undefined : { from: { opacity: 0 }, to: { opacity: 1 } },
          animationDuration: timing.fade,
          animationDelay: timing.conclusion,
          animationFillMode: 'backwards',
        }}>
        <Label variant="section" style={{ textAlign: 'center' }}>
          {impactCopy.spent}
        </Label>
      </Animated.View>
    </>
  );
}
