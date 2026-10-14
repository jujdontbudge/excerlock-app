import type { Rule } from '../model/types';
export class BankConditionConflict extends Error {
  constructor() {
    super('A Bank Condition needs to be your only Condition.');
    this.name = 'BankConditionConflict';
  }
}
export function assertBankExclusive(conditions: readonly Rule[]): void {
  if (conditions.length > 1 && conditions.some((condition) => condition.mode.kind === 'bank'))
    throw new BankConditionConflict();
}
