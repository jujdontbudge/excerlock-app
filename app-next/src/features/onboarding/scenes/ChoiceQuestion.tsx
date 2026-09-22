import { View } from 'react-native';
import { Heading, ChoiceRow } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { Reveal } from '../../../motion/Reveal';
import { onboardingCopy } from '../../../content/onboarding';
import { choiceQuestions } from '../../../content/onboardingChoices';
import { AnswerProps } from '../types';
import { ProfileQuestion } from '../profile/ProfileQuestion';
import { GoalIcon } from './GoalIcon';
import { weeklyExerciseQuestion } from '../../../content/exercisePreference';
export function ChoiceQuestion({ step, answers, setAnswer }: AnswerProps & { step: string }) {
  if (step === 'O05' || step === 'O06') return <ProfileQuestion step={step} answers={answers} setAnswer={setAnswer} />;
  const copy = onboardingCopy[step as keyof typeof onboardingCopy],
    question = choiceQuestions[step];
  return (
    <>
      <Reveal>
        <Heading title={step === 'O09' ? weeklyExerciseQuestion(answers.exercisePreference) : copy.title} centered />
      </Reveal>
      <View style={{ gap: t.space.md }}>
        {question.options.map((option, index) => (
          <Reveal key={option.id} index={index + 1}>
            <ChoiceRow
              emphasis="solid"
              title={option.title}
              icon={option.icon}
              leading={
                step === 'O08' ? (
                  <GoalIcon goal={option.id} selected={answers[question.key] === option.id} />
                ) : undefined
              }
              selected={answers[question.key] === option.id}
              onPress={() => setAnswer(question.key, option.id)}
            />
          </Reveal>
        ))}
      </View>
    </>
  );
}
