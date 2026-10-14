import type { ComponentType } from 'react';
import type { BankDrainUsage } from './BankDrainPort';
export type BankDrainDiagnosticState = BankDrainUsage & {
  available: boolean;
  phase: 'disarmed' | 'armed' | 'exhausted' | 'failed';
  bankMinutes: number;
  armedAt: string | null;
  tickMinutes: number;
  eventCount: number;
  monitorRegistered: boolean;
  activeMonitorCount: number;
  shieldConfigured: boolean;
  failure: string | null;
  ticks: BankDrainUsage[];
};
export interface BankDrainDiagnosticPort {
  snapshot(): Promise<BankDrainDiagnosticState>;
  arm(minutes: number, tickMinutes: 1 | 5): Promise<void>;
  disarm(): Promise<void>;
  chooseLockedApps(): Promise<void>;
  pickerHost?: ComponentType;
}
