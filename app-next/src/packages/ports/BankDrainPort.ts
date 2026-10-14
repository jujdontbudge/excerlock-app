import { Unsubscribe } from '../model/models';
export type BankDrainUsage = { usedMinutes: number; observedAt: string; armId?: string | null; failed?: boolean };
export interface BankDrainPort {
  arm(bankMinutes: number): Promise<void>;
  disarm(): Promise<void>;
  usage(): Promise<BankDrainUsage>;
  subscribe(callback: (usage: BankDrainUsage) => void): Unsubscribe;
}
export class BankDrainUsageChanged extends Error {
  constructor() {
    super('Bank usage changed before disarm');
    this.name = 'BankDrainUsageChanged';
  }
}
