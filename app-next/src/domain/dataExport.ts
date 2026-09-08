import { HistoryDay } from '../ports/models';
import { EarnedUnlock, Rule, RuleDay } from './types';

export const DATA_EXPORT_FORMAT = 'excerlock-data-export';
export const DATA_EXPORT_VERSION = 1;

export type DataExport = {
  format: typeof DATA_EXPORT_FORMAT;
  version: typeof DATA_EXPORT_VERSION;
  exportedAt: string;
  userId: string;
  units: 'km' | 'mi';
  rules: Rule[];
  ruleDays: RuleDay[];
  earnedUnlocks: EarnedUnlock[];
  history: HistoryDay[];
};

export type DataExportInput = Omit<DataExport, 'format' | 'version'>;

/**
 * The "Export my data" document (PRD): the user's conditions, rule days, earned unlocks and daily
 * history, in the app's own units. Nothing about the locked-app selection is ever part of it: the
 * opaque handle is meaningless off the device, and app names never existed here to begin with.
 * Saved gyms stay out too; they are device-local by the privacy law.
 */
export function buildDataExport(input: DataExportInput): DataExport {
  const byDay = (a: { day: string }, b: { day: string }) => a.day.localeCompare(b.day);
  return {
    format: DATA_EXPORT_FORMAT,
    version: DATA_EXPORT_VERSION,
    exportedAt: input.exportedAt,
    userId: input.userId,
    units: input.units,
    rules: input.rules.map((rule) => ({ ...rule })),
    ruleDays: [...input.ruleDays].sort(byDay),
    earnedUnlocks: [...input.earnedUnlocks].sort(byDay),
    history: [...input.history].sort(byDay),
  };
}

export const dataExportFileName = (exportedAt: string) => `excerlock-export-${exportedAt.slice(0, 10)}.json`;
export const dataExportJson = (data: DataExport) => JSON.stringify(data, null, 2);
