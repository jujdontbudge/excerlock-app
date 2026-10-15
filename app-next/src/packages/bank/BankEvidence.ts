import type { Rule, RuleDay } from '../model/types';
import type { GymInterval } from '../activity/gymMachine';
import {
  clippedDuration,
  type ExactStepMeasurement,
  type StepMeasurementRange,
} from '../progress/projectInstanceProgress';
import { creditedGymVisit } from '../progress/gymCreditFloor';
import { addDays, dayKey, localDayStart } from '../schedule/calendar';
import { bankStore, type BankAccount, type EarningRange } from './bankStore';
import { dailyMinimum, economy } from './economy';
import { syncBankCondition } from './BankLifecycle';
function earningRanges(account: BankAccount, now: string, timezone: string): Record<string, EarningRange> {
  const ranges = { ...account.earningRanges };
  let from = Math.max(Date.parse(account.createdAt), ...Object.values(ranges).map((range) => range.end));
  if (!Object.keys(ranges).length) from = Math.max(from, ...Object.values(account.days).map((row) => row.through));
  while (from < Date.parse(now)) {
    const day = dayKey(new Date(from).toISOString(), timezone);
    const end = Date.parse(localDayStart(addDays(day, 1), timezone));
    if (end <= from) throw new Error('Invalid Bank Day boundary');
    const key = `${timezone}:${from}:${end}`;
    ranges[key] = { day, timezone, from, end, amount: 0, through: from };
    from = end;
  }
  return ranges;
}
export function planBankMeasurements(
  now: string,
  timezone: string,
  sealedDays: ReadonlySet<string> = new Set(),
): StepMeasurementRange[] {
  syncBankCondition(now, timezone);
  const account = bankStore.getState().data.account;
  if (!account || account.activity !== 'walking') return [];
  const ranges = earningRanges(account, now, timezone);
  if (JSON.stringify(ranges) !== JSON.stringify(account.earningRanges))
    bankStore.getState().patch({ account: { ...account, earningRanges: ranges } });
  return Object.entries(ranges).flatMap(([key, range]) => {
    const to = Math.min(Date.parse(now), range.end);
    return !sealedDays.has(range.day) && range.through < to
      ? [{ key, from: range.from, to, timezone: range.timezone }]
      : [];
  });
}
export function projectBankEvidence(
  rules: readonly Rule[],
  previous: readonly RuleDay[],
  steps: Readonly<Record<string, ExactStepMeasurement>>,
  gym: readonly GymInterval[],
  configured: readonly string[],
  timezone: string,
  now: string,
  sealedDays: ReadonlySet<string> = new Set(),
): RuleDay[] {
  syncBankCondition(now, timezone);
  const account = bankStore.getState().data.account;
  const condition = rules.find((rule) => rule.id === account?.conditionId && rule.enabled && rule.mode.kind === 'bank');
  if (!account || !condition) return [...previous];
  let rows = [...previous];
  const days = { ...account.days };
  let pendingPoints = account.pendingPoints;
  const ranges = earningRanges(account, now, timezone);
  for (const [key, frame] of Object.entries(ranges)) {
    const range = { ...frame, to: Math.min(Date.parse(now), frame.end) };
    if (sealedDays.has(range.day) || range.to <= range.from) continue;
    const cursor = days[range.day];
    const difficulty =
      cursor?.difficulty ??
      Object.entries(account.difficultyDays)
        .filter(([day]) => day <= range.day)
        .sort(([a], [b]) => b.localeCompare(a))[0]?.[1] ??
      account.difficulty;
    const minimum = dailyMinimum(account.activity, difficulty);
    let measuredAmount = frame.amount;
    let through = frame.through;
    let metAt: number | null = null;
    if (account.activity === 'walking') {
      const sample = steps[key];
      if (
        sample &&
        sample.from === range.from &&
        sample.through > range.from &&
        sample.through <= range.to &&
        sample.timezone === range.timezone &&
        Number.isSafeInteger(sample.steps) &&
        sample.steps >= 0
      ) {
        measuredAmount = Math.max(measuredAmount, sample.steps);
        through = Math.max(through, sample.through);
      }
    } else {
      const intervals = gym
        .filter((visit) => configured.includes(visit.regionId) && creditedGymVisit(visit, condition))
        .map((visit) => ({ from: visit.confirmedAt, to: visit.exitedAt ?? Date.parse(now) }));
      const measured = clippedDuration(intervals, range.from, range.to, minimum * 60_000);
      measuredAmount = Math.max(measuredAmount, measured.milliseconds / 60_000);
      through = Math.max(through, range.to);
      metAt = measured.thresholdAt;
    }
    const accumulated = (cursor?.amount ?? 0) + (measuredAmount - frame.amount);
    const amount = account.activity === 'gym' ? Math.round(accumulated * 60_000) / 60_000 : accumulated;
    ranges[key] = { ...frame, amount: measuredAmount, through };
    const rate = economy[difficulty];
    const points = Math.floor(
      account.activity === 'walking'
        ? amount / rate.stepsPerPoint
        : (Math.round(amount * 60_000) * rate.pointsPerGymMinute) / 60_000,
    );
    pendingPoints += Math.max(0, points - (cursor?.points ?? 0));
    days[range.day] = { difficulty, amount, points, through: Math.max(cursor?.through ?? 0, through) };
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
  if (
    pendingPoints !== account.pendingPoints ||
    JSON.stringify(days) !== JSON.stringify(account.days) ||
    JSON.stringify(ranges) !== JSON.stringify(account.earningRanges)
  )
    bankStore.getState().patch({ account: { ...account, pendingPoints, days, earningRanges: ranges } });
  return rows;
}
export function bankAccountingDeadlines(now: string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const range of Object.values(bankStore.getState().data.account?.earningRanges ?? {}))
    if (range.end > Date.parse(now)) result[range.day] = Math.max(result[range.day] ?? 0, range.end);
  return result;
}
