import { dayKey } from '../../../schedule/calendar';
export type HistoryCredit = { idempotencyKey: string; from: number; to: number; steps: number };
export type InstanceStepMeasurement = { from: number; through: number; steps: number; timezone: string };
export type HistoryLedger = {
  version: 1;
  through: number | null;
  stepsByDay: Record<string, number>;
  instanceMeasurements: Record<string, InstanceStepMeasurement>;
};
export interface HistoryLedgerStorage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; }
const KEY = 'excerlock-next.history-credit-ledger.v1';
export class HistoryCreditLedger {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private storage: HistoryLedgerStorage) {}
  read(): Promise<HistoryLedger> { return this.serialize(() => this.load()); }
  replace(state: HistoryLedger): Promise<void> {
    return this.serialize(async () => {
      validateState(state);
      await this.save(state);
    });
  }
  apply(credit: HistoryCredit, timezone: string): Promise<HistoryLedger> {
    return this.serialize(async () => {
      if (!credit.idempotencyKey || !Number.isFinite(credit.from) || !Number.isFinite(credit.to) || credit.to <= credit.from ||
        !Number.isSafeInteger(credit.steps) || credit.steps < 0) throw new Error('Invalid measured history credit');
      const day = dayKey(new Date(credit.from).toISOString(), timezone);
      if (dayKey(new Date(credit.to - 1).toISOString(), timezone) !== day) throw new Error('History credit must be split at local midnight');
      const previous = await this.load();
      if (previous.through !== null && credit.to <= previous.through) return previous;
      if (previous.through !== null && credit.from < previous.through) throw new Error('History interval overlaps committed credit');
      const steps = (previous.stepsByDay[day] ?? 0) + credit.steps;
      if (!Number.isSafeInteger(steps)) throw new Error('History total exceeds supported range');
      const next: HistoryLedger = { ...previous, through: credit.to, stepsByDay: { ...previous.stepsByDay, [day]: steps } };
      await this.storage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }
  reset(): Promise<void> { return this.serialize(() => this.save(empty())); }
  readInstanceMeasurement(key: string): Promise<InstanceStepMeasurement | null> {
    return this.serialize(async () => {
      validateKey(key);
      return (await this.load()).instanceMeasurements[key] ?? null;
    });
  }
  recordInstanceMeasurement(key: string, sample: InstanceStepMeasurement): Promise<InstanceStepMeasurement> {
    return this.serialize(async () => {
      validateKey(key);
      validateMeasurement(sample);
      const state = await this.load();
      const previous = state.instanceMeasurements[key];
      if (previous && (previous.from !== sample.from || previous.timezone !== sample.timezone))
        throw new Error('Instance measurement key conflicts with its range');
      if (previous && sample.through < previous.through)
        throw new Error('Instance measurement cannot move backwards');
      if (previous && sample.through === previous.through) {
        if (sample.steps !== previous.steps) throw new Error('Instance measurement replay changed steps');
        return previous;
      }
      const next = { ...state, instanceMeasurements: { ...state.instanceMeasurements, [key]: sample } };
      await this.save(next);
      return sample;
    });
  }
  pruneBeforeDay(cutoffDay: string): Promise<HistoryLedger> {
    return this.serialize(async () => {
      validateDay(cutoffDay);
      const state = await this.load();
      const stepsByDay = Object.fromEntries(Object.entries(state.stepsByDay).filter(([day]) => day >= cutoffDay));
      const instanceMeasurements = Object.fromEntries(
        Object.entries(state.instanceMeasurements).filter(([, sample]) =>
          dayKey(new Date(sample.from).toISOString(), sample.timezone) >= cutoffDay),
      );
      if (Object.keys(stepsByDay).length !== Object.keys(state.stepsByDay).length ||
        Object.keys(instanceMeasurements).length !== Object.keys(state.instanceMeasurements).length)
        await this.save({ ...state, stepsByDay, instanceMeasurements });
      return { ...state, stepsByDay, instanceMeasurements };
    });
  }
  private async load(): Promise<HistoryLedger> {
    const raw = await this.storage.getItem(KEY);
    if (raw === null) return empty();
    const value: unknown = JSON.parse(raw);
    validateState(value);
    const record = value as HistoryLedger;
    const measurements = (record as HistoryLedger & { instanceMeasurements?: unknown }).instanceMeasurements;
    return { ...record, instanceMeasurements: (measurements ?? {}) as Record<string, InstanceStepMeasurement> };
  }
  private save(state: HistoryLedger): Promise<void> { return this.storage.setItem(KEY, JSON.stringify(state)); }
  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.catch(() => undefined).then(operation);
    this.queue = result.catch(() => undefined);
    return result;
  }
}
const empty = (): HistoryLedger => ({ version: 1, through: null, stepsByDay: {}, instanceMeasurements: {} });
function validateState(value: unknown): asserts value is HistoryLedger {
  if (!value || typeof value !== 'object') throw new Error('Invalid history ledger');
  const record = value as HistoryLedger;
  if (record.version !== 1 || (record.through !== null && !Number.isFinite(record.through)) || !record.stepsByDay ||
    typeof record.stepsByDay !== 'object' || Array.isArray(record.stepsByDay) ||
    Object.entries(record.stepsByDay).some(([day, steps]) => !/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isSafeInteger(steps) || steps < 0))
    throw new Error('Invalid history ledger');
  const measurements = (record as HistoryLedger & { instanceMeasurements?: unknown }).instanceMeasurements;
  if (measurements !== undefined && (!measurements || typeof measurements !== 'object' || Array.isArray(measurements) ||
    Object.entries(measurements).some(([key, sample]) => {
      try { validateKey(key); validateMeasurement(sample); return false; } catch { return true; }
    }))) throw new Error('Invalid history ledger');
}
function validateKey(key: string): void {
  if (!key) throw new Error('Invalid instance measurement key');
}
function validateMeasurement(value: unknown): asserts value is InstanceStepMeasurement {
  if (!value || typeof value !== 'object') throw new Error('Invalid instance measurement');
  const sample = value as InstanceStepMeasurement;
  if (!Number.isFinite(sample.from) || !Number.isFinite(sample.through) || sample.through <= sample.from ||
    !Number.isSafeInteger(sample.steps) || sample.steps < 0 || !sample.timezone)
    throw new Error('Invalid instance measurement');
  dayKey(new Date(sample.from).toISOString(), sample.timezone);
}
function validateDay(day: string): void {
  const parsed = Date.parse(`${day}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== day)
    throw new Error('Invalid history retention day');
}
