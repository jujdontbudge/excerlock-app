import type { BankDrainPort, BankDrainUsage } from '../../../ports/BankDrainPort';
export function BankDrainFake(now: () => string): BankDrainPort {
  let usage: BankDrainUsage = { usedMinutes: 0, observedAt: now() };
  const listeners = new Set<(value: BankDrainUsage) => void>();
  const reset = async () => {
    usage = { usedMinutes: 0, observedAt: now() };
    listeners.forEach(listener => listener(usage));
  };
  return {
    arm: reset,
    disarm: reset,
    usage: async () => usage,
    subscribe: callback => {
      listeners.add(callback);
      callback(usage);
      return () => { listeners.delete(callback); };
    },
  };
}
