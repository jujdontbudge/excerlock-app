import { View } from 'react-native';
import { Heading, Slider } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { LivingIcon } from '../../../motion/LivingIcon';
import { TickingNumber } from '../../../motion/TickingNumber';
import { onboardingCopy, onboardingLabels as c } from '../../../content/onboarding';
import { AnswerProps } from '../types';
export function O10({ answers, setAnswer }: AnswerProps) {
  const hours = Number(answers.estimatedDailyMinutes ?? 180) / 60;
  return (
    <>
      <Heading title={onboardingCopy.O10.title} support={onboardingCopy.O10.body} />
      <View style={{ flex: 1, justifyContent: 'center', gap: t.space.xxl }}>
        <LivingIcon name="clock" />
        <TickingNumber
          value={hours}
          precision={1}
          duration={t.motion.duration.press}
          label={hours === 1 ? c.hourUnit : c.hoursUnit}
        />
        <Slider
          label={c.hours}
          min={1}
          max={12}
          step={0.5}
          value={hours}
          onChange={(value) => setAnswer('estimatedDailyMinutes', value * 60)}
        />
      </View>
    </>
  );
}
