import { View } from 'react-native';
import { Heading } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { Reveal } from '../../../motion/Reveal';
import { onboardingCopy } from '../../../content/onboarding';
import { screenTimeRanges } from '../../../content/screenTime';
import { ScreenTimeChoice } from '../scenes/ScreenTimeChoice';
import { AnswerProps } from '../types';
export function O10({ answers, setAnswer }: AnswerProps) {
  const minutes = Number(answers.estimatedDailyMinutes ?? 180);
  const selected = screenTimeRanges.find((range) => minutes < range.upper);
  return (
    <>
      <Heading centered title={onboardingCopy.O10.title} support={onboardingCopy.O10.body} />
      <View style={{ gap: t.space.md, paddingTop: t.space.sm }}>
        {screenTimeRanges.map((range, index) => (
          <Reveal key={range.label} index={index + 1}>
            <ScreenTimeChoice
              label={range.label}
              selected={range === selected}
              onPress={() => setAnswer('estimatedDailyMinutes', range.minutes)}
            />
          </Reveal>
        ))}
      </View>
    </>
  );
}
