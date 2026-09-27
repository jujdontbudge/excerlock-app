import { Answers } from '../../model/answers';
export type AnswerProps = {
  answers: Answers;
  setAnswer: (key: string, value: string | number | boolean | number[] | string[]) => void;
};
