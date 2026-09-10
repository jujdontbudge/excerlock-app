import type { HistoryCredit } from './DetectionService';
import { dayKey } from '../../domain/calendar';
export type HistoryLedger = { version: 1; through: number | null; stepsByDay: Record<string, number> };
export interface HistoryLedgerStorage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; }
const KEY = 'excerlock-next.history-credit-ledger.v1';
/** A single durable record owns both observed totals and the deduplication cursor. */
export class HistoryCreditLedger {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private storage: HistoryLedgerStorage) {}
  read(): Promise<HistoryLedger> { return this.serialize(() => this.load()); }
  apply(credit: HistoryCredit, timezone: string): Promise<HistoryLedger> {
    return this.serialize(async () => {
      if (!credit.idempotencyKey || !Number.isFinite(credit.from) || !Number.isFinite(credit.to) || credit.to <= credit.from ||
        !Number.isSafeInteger(credit.steps) || credit.steps < 0) throw new Error('Invalid measured history credit');
      const day = dayKey(new Date(credit.from).toISOString(), timezone);
      if (dayKey(new Date(credit.to - 1).toISOString(), timezone) !== day) throw new Error('History credit must be split at local midnight');
      const previous = await this.load();
      if (previous.through !== null && credit.to <= previous.through) return previous;
      // A scalar interval total cannot be apportioned across an overlapping edge.
      // Root must initialize DetectionService's query cursor from this record.
      if (previous.through !== null && credit.from < previous.through) throw new Error('History interval overlaps committed credit');
      const steps = (previous.stepsByDay[day] ?? 0) + credit.steps;
      if (!Number.isSafeInteger(steps)) throw new Error('History total exceeds supported range');
      const next: HistoryLedger = { version: 1, through: credit.to, stepsByDay: { ...previous.stepsByDay, [day]: steps } };
      await this.storage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }
  /** Must be awaited as part of account deletion/local data erasure. */
  reset(): Promise<void> { return this.serialize(() => this.storage.setItem(KEY, JSON.stringify({ version: 1, through: null, stepsByDay: {} }))); }
  private async load(): Promise<HistoryLedger> {
    const raw = await this.storage.getItem(KEY);
    if (raw === null) return { version: 1, through: null, stepsByDay: {} };
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') throw new Error('Invalid history ledger');
    const record = value as HistoryLedger;
    if (record.version !== 1 || (record.through !== null && !Number.isFinite(record.through)) || !record.stepsByDay ||
      typeof record.stepsByDay !== 'object' || Array.isArray(record.stepsByDay) ||
      Object.entries(record.stepsByDay).some(([day, steps]) => !/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isSafeInteger(steps) || steps < 0)) throw new Error('Invalid history ledger');
    return record;
  }
  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.catch(() => undefined).then(operation);
    this.queue = result.catch(() => undefined);
    return result;
  }
}
