import type { ExperimentVariant } from "./experiments";
import {
  decodeShieldCopyPayload,
  type ShieldCopyPayload,
} from "./shieldCopyPayload";
import { useExperimentVariant } from "./useExperimentVariant";

export function useShieldCopyExperiment(): {
  copy: ShieldCopyPayload | null;
  variant: ExperimentVariant<"exp-shield-copy-v1">;
} {
  const selection = useExperimentVariant("exp-shield-copy-v1");
  return {
    copy: selection.variant === "treatment"
      ? decodeShieldCopyPayload(selection.payload)
      : null,
    variant: selection.variant,
  };
}
