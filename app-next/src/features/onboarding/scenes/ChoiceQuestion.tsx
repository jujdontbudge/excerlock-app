import { View } from 'react-native';
import { Heading, ChoiceRow } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { Reveal } from '../../../motion/Reveal';
import { onboardingCopy } from '../../../content/onboarding';
import { choiceQuestions } from '../../../content/onboardingChoices';
import { AnswerProps } from '../types';
export function ChoiceQuestion({ step, answers, setAnswer }: AnswerProps & { step: string }) {
  const copy = onboardingCopy[step as keyof typeof onboardingCopy],
    question = choiceQuestions[step];
  return (
    <>
      <Reveal>
        <Heading title={copy.title} support={copy.body} />
      </Reveal>
      <View style={{ gap: t.space.md }}>
        {question.options.map((option, index) => (
          <Reveal key={option.id} index={index + 1}>
            <ChoiceRow
              title={option.title}
              icon={option.icon}
              selected={answers[question.key] === option.id}
              onPress={() => setAnswer(question.key, option.id)}
            />
          </Reveal>
        ))}
      </View>
    </>
  );
}
