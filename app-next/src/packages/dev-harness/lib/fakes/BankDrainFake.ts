import type { BankDrainPort, BankDrainUsage } from '../../../ports/BankDrainPort';
export function createBankDrainFake(
  now: () => string,
): BankDrainPort & { advance(minutes: number): void; reset(): void } {
  let usedMinutes = 0,
    armed = false;
  const listeners = new Set<(usage: BankDrainUsage) => void>();
  const usage = () => ({ usedMinutes, observedAt: now() });
  return {
    arm: async () => {
      usedMinutes = 0;
      armed = true;
    },
    disarm: async () => {
      armed = false;
      usedMinutes = 0;
    },
    usage: async () => usage(),
    subscribe: (callback) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    advance: (minutes) => {
      if (!armed || !Number.isFinite(minutes) || minutes < 0) return;
      usedMinutes += minutes;
      const sample = usage();
      listeners.forEach((listener) => listener(sample));
    },
    reset: () => {
      usedMinutes = 0;
      armed = false;
    },
  };
}
