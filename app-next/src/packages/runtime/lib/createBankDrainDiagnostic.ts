import type { ComponentType } from 'react';
import type { BankDrainDiagnosticPort } from '../../ports/BankDrainDiagnosticPort';
import type { ScreenTimePort } from '../../ports/ScreenTimePort';
import type { NativeBankDrain } from '../../enforcement/NativeBankDrain';
import { createNativeScreenTimePort } from '../../app-selection/createNativeScreenTimePort';
export function createBankDrainDiagnostic(drain: NativeBankDrain, screenTime?: ScreenTimePort, pickerHost?: ComponentType): BankDrainDiagnosticPort {
  const picker = screenTime ?? createNativeScreenTimePort({
    applyLock: async () => ({ applied: false }),
    registerWatchdog: async plan => plan,
    cancelWatchdog: async () => undefined,
  }, { isDenied: () => false, remember: () => undefined });
  return {
    snapshot: () => drain.diagnostics(),
    arm: (minutes, tickMinutes) => drain.armSpike(minutes, tickMinutes),
    disarm: () => drain.disarm(),
    chooseLockedApps: async () => {
      await drain.disarm();
      await picker.requestAuthorization();
      await picker.presentAppPicker();
    },
    pickerHost,
  };
}
