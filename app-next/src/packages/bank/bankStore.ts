import { createPersistedStore } from '../persistence/createPersistedStore';
import * as v from '../persistence/validation';
import type { Rule } from '../model/types';
import type { Difficulty } from '../model/bankEconomy';
export type EarningRange = {
  day: string;
  timezone: string;
  from: number;
  end: number;
  amount: number;
  through: number;
};
export type EarningDay = { difficulty: Difficulty; amount: number; points: number; through: number };
export type BankAccount = {
  conditionId: string;
  activity: 'walking' | 'gym';
  createdAt: string;
  difficulty: Difficulty;
  difficultyDays: Record<string, Difficulty>;
  pendingDifficulty: { difficulty: Difficulty; effectiveDay: string } | null;
  points: number;
  pendingPoints: number;
  collectedOnce?: boolean;
  bankMinutes: number;
  drainUsedMinutes: number;
  drainArmId?: string | null;
  drainFailed?: boolean;
  earningRanges?: Record<string, EarningRange>;
  drainObservedAt: string | null;
  days: Record<string, EarningDay>;
};
export type BankData = { account: BankAccount | null };
const difficulty = v.oneOf(['easy', 'medium', 'hard']);
const day = (value: unknown) =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
const whole = (value: unknown) => v.number()(value) && Number.isSafeInteger(value);
const optional = (check: (value: unknown) => boolean) => (value: unknown) => value === undefined || check(value);
export const bankStore = createPersistedStore<BankData>(
  'bank',
  { account: null },
  {
    account: v.nullable(
      v.shape({
        conditionId: v.text,
        activity: v.oneOf(['walking', 'gym']),
        createdAt: v.iso,
        difficulty,
        difficultyDays: (value) =>
          v.object(value) && Object.entries(value).every(([key, entry]) => day(key) && difficulty(entry)),
        pendingDifficulty: v.nullable(v.shape({ difficulty, effectiveDay: day })),
        points: whole,
        pendingPoints: whole,
        collectedOnce: optional(v.bool),
        bankMinutes: v.number(),
        drainUsedMinutes: v.number(),
        drainArmId: optional(v.nullable(v.text)),
        drainFailed: optional(v.bool),
        earningRanges: optional(
          (value) =>
            v.object(value) &&
            Object.values(value).every(
              (row) =>
                v.shape({
                  day,
                  timezone: v.text,
                  from: v.number(),
                  end: v.number(),
                  amount: v.number(),
                  through: v.number(),
                })(row) &&
                v.object(row) &&
                Number(row.end) > Number(row.from) &&
                Number(row.through) >= Number(row.from) &&
                Number(row.through) <= Number(row.end),
            ),
        ),
        drainObservedAt: v.nullable(v.iso),
        days: (value) =>
          v.object(value) &&
          Object.entries(value).every(
            ([key, row]) =>
              day(key) && v.shape({ difficulty, amount: v.number(), points: whole, through: v.number() })(row),
          ),
      }),
    ),
  },
);
export function bankMinutesFor(conditions: readonly Rule[]): number {
  const account = bankStore.getState().data.account;
  return account &&
    !account.drainFailed &&
    conditions.some(
      (condition) => condition.enabled && condition.id === account.conditionId && condition.mode.kind === 'bank',
    )
    ? account.bankMinutes
    : 0;
}
