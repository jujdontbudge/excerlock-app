import { View } from 'react-native';
import { Heading, Label, Slider } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { onboardingCopy, onboardingLabels, screenTimeSlider } from '../../../content/onboarding';
import { AnswerProps } from '../types';

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder
    ? `${hours}${onboardingLabels.hoursShort} ${remainder}${onboardingLabels.minutesShort}`
    : `${hours}${onboardingLabels.hoursShort}`;
}

export function O10({ answers, setAnswer }: AnswerProps) {
  const minutes = Math.min(
    screenTimeSlider.maxMinutes,
    Math.max(screenTimeSlider.minMinutes, Number(answers.estimatedDailyMinutes ?? 180)),
  );
  return (
    <>
      <Heading centered title={onboardingCopy.O10.title} support={onboardingCopy.O10.body} />
      <View style={{ flex: 1, justifyContent: 'center', gap: t.space.xl }}>
        <Label variant="metric" style={{ textAlign: 'center' }}>
          {formatMinutes(minutes)}
        </Label>
        <Label variant="support" tone="secondary" style={{ textAlign: 'center' }}>
          {minutes === 60 ? onboardingLabels.hourUnit : onboardingLabels.hoursUnit}
        </Label>
        <Slider
          label={onboardingLabels.hours}
          value={minutes}
          min={screenTimeSlider.minMinutes}
          max={screenTimeSlider.maxMinutes}
          step={screenTimeSlider.stepMinutes}
          onChange={(value) => setAnswer('estimatedDailyMinutes', value)}
        />
      </View>
    </>
  );
}
