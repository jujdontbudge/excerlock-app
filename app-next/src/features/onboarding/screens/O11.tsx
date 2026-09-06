import { View } from 'react-native';
import { Heading } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { TickingNumber } from '../../../motion/TickingNumber';
import { onboardingCopy, onboardingLabels as c } from '../../../content/onboarding';
import { AnswerProps } from '../types';
export function O11({ answers }: AnswerProps) {
  const hours = Number(answers.estimatedDailyMinutes ?? 180) / 60;
  return (
    <>
      <Heading title={onboardingCopy.O11.title} support={onboardingCopy.O11.body} centered />
      <View style={{ flex: 1, justifyContent: 'center', gap: t.space.xxl }}>
        <TickingNumber precision={1} value={hours} label={c.daily} />
        <TickingNumber value={hours * 30} label={c.month} delay={t.motion.duration.standard} />
        <TickingNumber value={(hours * 365) / 24} label={c.year} delay={t.motion.duration.standard * 2} />
      </View>
    </>
  );
}
