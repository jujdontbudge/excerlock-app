import type { Rule, RuleDay } from '../model/types';
import type { GymInterval } from '../activity/gymMachine';
import {
  clippedDuration,
  type ExactStepMeasurement,
  type StepMeasurementRange,
} from '../progress/projectInstanceProgress';
import { creditedGymVisit } from '../progress/gymCreditFloor';
import { addDays, dayKey, localDayStart } from '../schedule/calendar';
import { bankStore, type BankAccount } from './bankStore';
import { dailyMinimum, economy } from './economy';
import { syncBankCondition } from './BankLifecycle';
function earningRanges(account: BankAccount, now: string, timezone: string) {
  const ranges = [];
  const today = dayKey(now, timezone);
  for (let day = dayKey(account.createdAt, timezone); day <= today; day = addDays(day, 1)) {
    const from = Math.max(Date.parse(localDayStart(day, timezone)), Date.parse(account.createdAt));
    const end = Date.parse(localDayStart(addDays(day, 1), timezone));
    const to = Math.min(Date.parse(now), end);
    if (to > from) ranges.push({ day, from, to, end, key: `${timezone}:${from}:${end}`, timezone });
  }
  return ranges;
}
export function planBankMeasurements(now: string, timezone: string): StepMeasurementRange[] {
  syncBankCondition(now, timezone);
  const account = bankStore.getState().data.account;
  if (!account || account.activity !== 'walking') return [];
  return earningRanges(account, now, timezone).filter((range) => (account.days[range.day]?.through ?? 0) < range.end);
}
export function projectBankEvidence(
  rules: readonly Rule[],
  previous: readonly RuleDay[],
  steps: Readonly<Record<string, ExactStepMeasurement>>,
  gym: readonly GymInterval[],
  configured: readonly string[],
  timezone: string,
  now: string,
): RuleDay[] {
  syncBankCondition(now, timezone);
  const account = bankStore.getState().data.account;
  const condition = rules.find((rule) => rule.id === account?.conditionId && rule.enabled && rule.mode.kind === 'bank');
  if (!account || !condition) return [...previous];
  let rows = [...previous];
  const days = { ...account.days };
  let pendingPoints = account.pendingPoints;
  for (const range of earningRanges(account, now, timezone)) {
    const cursor = days[range.day];
    const difficulty =
      cursor?.difficulty ??
      Object.entries(account.difficultyDays)
        .filter(([day]) => day <= range.day)
        .sort(([a], [b]) => b.localeCompare(a))[0]?.[1] ??
      account.difficulty;
    const minimum = dailyMinimum(account.activity, difficulty);
    let amount = cursor?.amount ?? 0;
    let through = cursor?.through ?? 0;
    let metAt: number | null = null;
    if (account.activity === 'walking') {
      const sample = steps[range.key];
      if (
        sample &&
        sample.from === range.from &&
        sample.through > range.from &&
        sample.through <= range.to &&
        sample.timezone === timezone &&
        Number.isSafeInteger(sample.steps) &&
        sample.steps >= 0
      ) {
        amount = Math.max(amount, sample.steps);
        through = Math.max(through, sample.through);
      }
    } else {
      const intervals = gym
        .filter((visit) => configured.includes(visit.regionId) && creditedGymVisit(visit, condition))
        .map((visit) => ({ from: visit.confirmedAt, to: visit.exitedAt ?? Date.parse(now) }));
      const measured = clippedDuration(intervals, range.from, range.to, minimum * 60_000);
      amount = Math.max(amount, measured.milliseconds / 60_000);
      through = Math.max(through, range.to);
      metAt = measured.thresholdAt;
    }
    const rate = economy[difficulty];
    const points = Math.floor(
      account.activity === 'walking' ? amount / rate.stepsPerPoint : amount * rate.pointsPerGymMinute,
    );
    pendingPoints += Math.max(0, points - (cursor?.points ?? 0));
    days[range.day] = { difficulty, amount, points, through };
    const old = rows.find((row) => row.ruleId === condition.id && row.day === range.day);
    const met = old?.met === true || amount >= minimum;
    const row = {
      ruleId: condition.id,
      day: range.day,
      progress: amount,
      met,
      metAt: met ? (old?.metAt ?? new Date(metAt ?? through).toISOString()) : null,
    };
    rows = [...rows.filter((candidate) => candidate.ruleId !== row.ruleId || candidate.day !== row.day), row];
  }
  if (pendingPoints !== account.pendingPoints || JSON.stringify(days) !== JSON.stringify(account.days))
    bankStore.getState().patch({ account: { ...account, pendingPoints, days } });
  return rows;
}
