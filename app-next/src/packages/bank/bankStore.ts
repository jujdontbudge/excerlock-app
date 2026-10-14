import { createPersistedStore } from '../persistence/createPersistedStore';
import * as v from '../persistence/validation';
import type { Difficulty } from './economy';
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
  bankMinutes: number;
  drainUsedMinutes: number;
  drainObservedAt: string | null;
  days: Record<string, EarningDay>;
};
export type BankData = { account: BankAccount | null };
const difficulty = v.oneOf(['easy', 'medium', 'hard']);
const day = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
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
        points: v.number(),
        pendingPoints: v.number(),
        bankMinutes: v.number(),
        drainUsedMinutes: v.number(),
        drainObservedAt: v.nullable(v.iso),
        days: (value) =>
          v.object(value) &&
          Object.entries(value).every(
            ([key, row]) =>
              day(key) && v.shape({ difficulty, amount: v.number(), points: v.number(), through: v.number() })(row),
          ),
      }),
    ),
  },
);
