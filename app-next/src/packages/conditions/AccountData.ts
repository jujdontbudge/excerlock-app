import type { LockedApps, Rule, RuleDay, GymPresence } from '../model/types';
import { rulesStore } from './rulesStore';
import { ruleDaysStore } from './ruleDaysStore';

export type ConditionsAccountData = {
  rules: Rule[];
  lockedApps: LockedApps;
  migrationNote: string | null;
  days: RuleDay[];
  gymPresence: GymPresence | null;
};

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function exportConditionsAccountData(): ConditionsAccountData {
  const rules = rulesStore.getState().data;
  const days = ruleDaysStore.getState().data;
  return copy({ ...rules, ...days });
}

export async function importConditionsAccountData(data: ConditionsAccountData): Promise<void> {
  const value = copy(data);
  rulesStore.getState().reset();
  ruleDaysStore.getState().reset();
  rulesStore.getState().patch({
    rules: value.rules,
    lockedApps: value.lockedApps,
    migrationNote: value.migrationNote,
  });
  ruleDaysStore.getState().patch({ days: value.days, gymPresence: value.gymPresence });
  await Promise.all([rulesStore.persistBarrier(), ruleDaysStore.persistBarrier()]);
}

export async function resetConditionsAccountData(): Promise<void> {
  rulesStore.getState().reset();
  ruleDaysStore.getState().reset();
  await Promise.all([rulesStore.persistBarrier(), ruleDaysStore.persistBarrier()]);
}
