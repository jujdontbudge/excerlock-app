export type Answers = Record<string, string | number | boolean | number[]>;
export type FlowState = { step: string; answers: Answers };
