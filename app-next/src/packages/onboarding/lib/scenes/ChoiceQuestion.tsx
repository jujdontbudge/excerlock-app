import { View } from 'react-native';
import { Heading, ChoiceRow } from '../../../ui';
import { Label } from '../../../ui/Label';
import { tokens as t } from '../../../ui/tokens';
import { Reveal } from '../../../ui/Reveal';
import { onboardingCopy, onboardingLabels } from '../onboardingCopy';
import { choiceQuestions } from '../onboardingChoicesCopy';
import { AnswerProps } from '../types';
import { bodyGoals } from '../../../model/answers';
import { ProfileQuestion } from '../profile/ProfileQuestion';
import { GoalIcon } from './GoalIcon';
export function ChoiceQuestion({ step, answers, setAnswer }: AnswerProps & { step: string }) {
  if (step === 'O05' || step === 'O06') return <ProfileQuestion step={step} answers={answers} setAnswer={setAnswer} />;
  const copy = onboardingCopy[step as keyof typeof onboardingCopy],
    question = choiceQuestions[step],
    options = step === 'O25' ? question.options.filter((option) => bodyGoals(answers).some((goal) => goal === option.id)) : question.options,
    current = answers[question.key],
    picked: string[] = Array.isArray(current) ? current.map(String) : typeof current === 'string' ? [current] : [],
    isSelected = (id: string) => (question.multiple ? picked.includes(id) : current === id),
    choose = (id: string) => {
      if (!question.multiple) return setAnswer(question.key, id);
      const next = picked.includes(id) ? picked.filter((value) => value !== id) : [...picked, id];
      setAnswer(question.key, question.options.map((option) => option.id).filter((value) => next.includes(value)));
    };
  return (
    <>
      <Reveal>
        <View style={{ gap: t.space.xs }}>
          <Heading title={copy.title} centered />
          {question.multiple ? <Label style={{ textAlign: 'center' }}>{onboardingLabels.selectAll}</Label> : null}
        </View>
      </Reveal>
      <View style={{ gap: t.space.md }}>
        {options.map((option, index) => (
          <Reveal key={option.id} index={index + 1}>
            <ChoiceRow
              emphasis="solid"
              title={option.title}
              icon={option.icon}
              leading={
                step === 'O08' ? (
                  <GoalIcon goal={option.id} selected={isSelected(option.id)} />
                ) : undefined
              }
              multiple={question.multiple}
              selected={isSelected(option.id)}
              onPress={() => choose(option.id)}
            />
          </Reveal>
        ))}
      </View>
    </>
  );
}
