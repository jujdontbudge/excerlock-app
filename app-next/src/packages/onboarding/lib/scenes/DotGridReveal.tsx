import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Heading, Label } from '../../../ui';
import { tokens as t } from '../../../ui/tokens';
import { useMotion } from '../../../ui/useMotion';
import { onboardingCopy } from '../onboardingCopy';
import { impactCopy as c } from '../impactCopy';
import { ImpactDots } from '../impact/ImpactDots';
import { FreeTimePercentage } from '../impact/FreeTimePercentage';
import { impactSummary } from '../../model';
import { impactTiming as timing } from '../impact/timing';
import { AnswerProps } from '../types';
export function DotGridReveal({ step, answers }: AnswerProps & { step: 'O12' | 'O13' | 'O14' }) {
  const minutes = Number(answers.estimatedDailyMinutes ?? 180),
    m = useMotion(),
    summary = impactSummary(minutes);
  return (
    <>
      <Animated.View
        style={{ minHeight: t.layout.ring }}
        key={step}
        entering={FadeIn.duration(m.reduced ? 0 : timing.title)}
        exiting={FadeOut.duration(m.reduced ? 0 : timing.title)}>
        <Heading title={onboardingCopy[step].title} centered />
      </Animated.View>
      <View style={{ paddingTop: t.space.xxl, gap: t.space.xl }}>
        <View>
          <ImpactDots step={step} minutes={minutes} />
          {step === 'O14' ? <FreeTimePercentage hours={summary.hours} /> : null}
        </View>
        <Animated.View
          key={step + '-caption'}
          style={{
            animationName: m.reduced ? undefined : { from: { opacity: 0 }, to: { opacity: 1 } },
            animationDuration: timing.fade,
            animationDelay: step === 'O14' ? timing.conclusion : timing.fade,
            animationFillMode: 'backwards',
            gap: t.space.md,
          }}>
          {step === 'O14' ? (
            <Label style={{ textAlign: 'center' }}>{summary.days > summary.freeDays ? c.overflow : c.conclusion}</Label>
          ) : null}
        </Animated.View>
      </View>
    </>
  );
}
