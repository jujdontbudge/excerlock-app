import { View } from 'react-native';
import { choiceQuestions } from '../onboardingChoicesCopy';
import { Reveal } from '../../../ui/Reveal';
import { AnswerProps } from '../types';
import { ProfileHeading } from './ProfileHeading';
import { ProfileChoiceRow } from './ProfileChoiceRow';
import { ReferralIcon } from './ReferralIcon';
import { SetupPresentation } from '../../../ui/SetupPresentation';
import { tokens as t } from '../../../ui/tokens';
export function ProfileQuestion({ step, answers, setAnswer }: AnswerProps & { step: 'O05' | 'O06' }) {
  const question = choiceQuestions[step];
  return (
    <>
      <ProfileHeading step={step} />
      <SetupPresentation>
        <View style={{ gap: t.space.md }}>
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
      </SetupPresentation>
    </>
  );
}
