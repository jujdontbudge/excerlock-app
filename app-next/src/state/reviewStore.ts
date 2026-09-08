import { defineStore } from './createPersistedStore';
import * as v from './validation';

/** The rating policy's memory: install date, prompts shown so far, and whether Rate was tapped by hand. */
export const reviewStore = defineStore<{
  installedAt: string | null;
  promptCount: number;
  manualRateTapped: boolean;
}>({
  name: 'review',
  initial: { installedAt: null, promptCount: 0, manualRateTapped: false },
  schemaVersion: 1,
  migrations: { 0: (raw) => raw },
  validators: { installedAt: v.nullable(v.iso), promptCount: v.number(0, 3), manualRateTapped: v.bool },
});
