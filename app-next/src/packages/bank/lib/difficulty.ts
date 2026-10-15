import type { Difficulty } from '../../model/bankEconomy';
import type { BankAccount } from '../bankStore';
export function difficultyForDay(account: BankAccount, day: string): Difficulty {
  if (account.pendingDifficulty && account.pendingDifficulty.effectiveDay <= day) return account.pendingDifficulty.difficulty;
  return account.days[day]?.difficulty ?? Object.entries(account.difficultyDays)
    .filter(([effectiveDay]) => effectiveDay <= day)
    .sort(([left], [right]) => right.localeCompare(left))[0]?.[1] ?? account.difficulty;
}
