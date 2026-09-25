import { Heading, ChoiceGrid } from '../ui';
import { Activity } from '../model/types';
import { onboardingCopy as c } from './lib/onboardingCopy';
import { AnswerProps } from './lib/types';
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
