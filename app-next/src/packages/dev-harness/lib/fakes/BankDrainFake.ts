import type { BankDrainPort, BankDrainUsage } from '../../../ports/BankDrainPort';
export function createBankDrainFake(
  now: () => string,
): BankDrainPort & { advance(minutes: number): void; reset(): void } {
  let usedMinutes = 0,
    armed = false,
    bankMinutes = 0,
    generation = 0,
    armId: string | null = null;
  const listeners = new Set<(usage: BankDrainUsage) => void>();
  const usage = () => ({ usedMinutes, observedAt: now(), armId, failed: false });
  return {
    available: true,
    arm: async (minutes) => {
      bankMinutes = minutes;
      armId = `fake-bank-${++generation}`;
      usedMinutes = 0;
      armed = true;
    },
    disarm: async () => {
      armed = false;
      armId = null;
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
      usedMinutes = Math.min(bankMinutes, usedMinutes + minutes);
      const sample = usage();
      listeners.forEach((listener) => listener(sample));
    },
    reset: () => {
      armed = false;
      armId = null;
      usedMinutes = 0;
    },
  };
}
