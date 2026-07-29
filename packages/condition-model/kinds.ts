export const CONDITION_KINDS = [
  { kind: "state", rewardFamily: "sustainedUnlock" },
  { kind: "event", rewardFamily: "discretePayout" },
  { kind: "rate", rewardFamily: "proportionalCredit" },
] as const;

export type ConditionKind = (typeof CONDITION_KINDS)[number]["kind"];
export type RewardFamily = (typeof CONDITION_KINDS)[number]["rewardFamily"];
