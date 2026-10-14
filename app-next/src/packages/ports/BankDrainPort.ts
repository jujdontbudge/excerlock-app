import { Unsubscribe } from '../model/models';
export type BankDrainUsage = { usedMinutes: number; observedAt: string };
export interface BankDrainPort {
  arm(bankMinutes: number): Promise<void>;
  disarm(): Promise<void>;
  usage(): Promise<BankDrainUsage>;
  subscribe(callback: (usage: BankDrainUsage) => void): Unsubscribe;
}
