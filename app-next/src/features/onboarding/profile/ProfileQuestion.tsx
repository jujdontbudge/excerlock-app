import { View } from 'react-native';
import { profileTokens as p } from '../../../design-system/profileTokens';
import { choiceQuestions } from '../../../content/onboardingChoices';
import { Reveal } from '../../../motion/Reveal';
import { AnswerProps } from '../types';
import { ProfileHeading } from './ProfileHeading';
import { ProfileChoiceRow } from './ProfileChoiceRow';
import { ReferralIcon } from './ReferralIcon';
import { SolidChoices } from '../../../design-system/ChoiceAppearance';
export function ProfileQuestion({ step, answers, setAnswer }: AnswerProps & { step: 'O05' | 'O06' }) {
  const question = choiceQuestions[step];
  return (
    <>
      <ProfileHeading step={step} />
      <SolidChoices>
        <View style={{ gap: p.row.gap }}>
        {question.options.map((option, index) => (
          <Reveal key={option.id} index={index + 1}>
            <ProfileChoiceRow
              title={option.title}
              selected={answers[question.key] === option.id}
              onPress={() => setAnswer(question.key, option.id)}
              leading={
                step === 'O05' ? (
                  <ReferralIcon name={option.id} selected={answers[question.key] === option.id} />
                ) : undefined
              }
            />
          </Reveal>
        ))}
        </View>
      </SolidChoices>
    </>
  );
}
