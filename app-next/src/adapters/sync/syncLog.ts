import { create } from 'zustand';
import { RestoreSummary } from '../../domain/syncMerge';

/**
 * Not persisted. The developer menu is the only reader: sync never blocks or alerts the product UI, so
 * its failures land here. Entries carry counts and reasons, never row contents.
 */
export type SyncLogEntry = { at: string; level: 'info' | 'warn' | 'error'; message: string };
export type RestoreRecord = { at: string; summary: RestoreSummary; localWasEmpty: boolean };

type SyncLogState = {
  entries: SyncLogEntry[];
  authRequired: boolean;
  lastPushAt: string | null;
  lastRestore: RestoreRecord | null;
  log: (level: SyncLogEntry['level'], message: string, at: string) => void;
  setAuthRequired: (value: boolean) => void;
  pushed: (at: string) => void;
  restored: (record: RestoreRecord) => void;
  clear: () => void;
};

const MAX_ENTRIES = 100;

export const syncLog = create<SyncLogState>()((set) => ({
  entries: [],
  authRequired: false,
  lastPushAt: null,
  lastRestore: null,
  log: (level, message, at) => set((state) => ({ entries: [...state.entries, { at, level, message }].slice(-MAX_ENTRIES) })),
  setAuthRequired: (authRequired) => set({ authRequired }),
  pushed: (lastPushAt) => set({ lastPushAt }),
  restored: (lastRestore) => set({ lastRestore }),
  clear: () => set({ entries: [], authRequired: false, lastPushAt: null, lastRestore: null }),
}));
