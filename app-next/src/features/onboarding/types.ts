import { Answers } from '../../onboarding/types';
export type AnswerProps = {
  answers: Answers;
  setAnswer: (key: string, value: string | number | boolean | number[]) => void;
};
