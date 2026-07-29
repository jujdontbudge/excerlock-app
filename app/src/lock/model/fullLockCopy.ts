import { formatMinutes } from "@/home";

import type { AllowanceValues } from "./fullLock";

/** The one irreversible-feeling switch in the module, so it always confirms. */
export interface FullLockConfirmation {
  readonly title: string;
  readonly body: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
}

/**
 * Written from the allowance rather than from a fixed string, so the sheet
 * promises exactly what the switch will do — including the minutes it restores.
 */
export function fullLockConfirmation(
  values: AllowanceValues,
  turningOn: boolean,
): FullLockConfirmation {
  if (turningOn) {
    return {
      title: "Turn on Full Lock?",
      body: "Your apps stay shielded from the day boundary until your first earn.",
      confirmLabel: "Yes, turn it on",
      cancelLabel: "Not now",
    };
  }

  const restored = values.allowanceBeforeFullLock;
  return {
    title: "Turn off Full Lock?",
    body:
      restored === null
        ? "Your daily allowance goes back to unlimited until you set one in Manage."
        : `Your daily allowance goes back to ${formatMinutes(restored)}.`,
    confirmLabel: "Yes, turn it off",
    cancelLabel: "Keep it on",
  };
}
