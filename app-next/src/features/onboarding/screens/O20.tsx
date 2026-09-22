import { Heading, ChoiceGrid } from '../../../design-system';
import { Activity } from '../../../domain/types';
import { onboardingCopy as c } from '../../../content/onboarding';
import { AnswerProps } from '../types';
export function O20({ answers, setAnswer }: AnswerProps) {
  return (
    <>
      <Heading title={c.O20.title} support={c.O20.body} centered />
      <ChoiceGrid
        emphasis="solid"
        selected={answers.activity as Activity | undefined}
        onChange={(activity) => {
          setAnswer('activity', activity);
          if (activity === 'walking' && answers.walkingMode === undefined) setAnswer('walkingMode', 'state');
        }}
      />
    </>
  );
}
