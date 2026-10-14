import type { BankDrainPort } from '../../ports/BankDrainPort';
export function createNoopBankDrain(): BankDrainPort {
  return {
    arm: async () => undefined,
    disarm: async () => undefined,
    usage: async () => ({ usedMinutes: 0, observedAt: new Date().toISOString() }),
    subscribe: () => () => undefined,
  };
}
