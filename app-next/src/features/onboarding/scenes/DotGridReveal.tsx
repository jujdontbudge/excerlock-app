import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Heading, DotGrid, Label } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { fadeIn, fadeOut } from '../../../motion/presets';
import { onboardingCopy, onboardingLabels as c } from '../../../content/onboarding';
import { AnswerProps } from '../types';
export function DotGridReveal({ step, answers }: AnswerProps & { step: 'O12' | 'O13' | 'O14' }) {
  const hours = Number(answers.estimatedDailyMinutes ?? 180) / 60,
    count = step === 'O12' ? 0 : Math.round((365 * (step === 'O13' ? c.freeHours : hours)) / 24),
    label = step === 'O12' ? c.yearGrid : step === 'O13' ? c.freeGrid : c.scrollGrid;
  return (
    <>
      <Animated.View key={step} entering={fadeIn} exiting={fadeOut}>
        <Heading title={onboardingCopy[step].title} support={onboardingCopy[step].body} centered />
      </Animated.View>
      <View style={{ flex: 1, justifyContent: 'center', gap: t.space.xl }}>
        <DotGrid total={365} emphasized={count} label={label} />
        {step === 'O14' ? (
          <Animated.View entering={fadeIn} exiting={fadeOut}>
            <Label variant="metricSmall" style={{ textAlign: 'center', color: t.brand.primary }}>
              {Math.round((hours * 365) / 24)} {c.year}
            </Label>
          </Animated.View>
        ) : null}
      </View>
    </>
  );
}
