import { useContext } from "react";

import { ExperimentContext } from "./experimentContext";
import type {
  ExperimentFlagKey,
  ExperimentVariant,
} from "./experiments";

export interface ExperimentSelection<Key extends ExperimentFlagKey> {
  payload: unknown;
  variant: ExperimentVariant<Key>;
}

export function useExperimentVariant<Key extends ExperimentFlagKey>(
  flagKey: Key,
): ExperimentSelection<Key> {
  const snapshot = useContext(ExperimentContext);
  if (!snapshot || snapshot.flagKey !== flagKey) {
    return {
      payload: null,
      variant: "control" as ExperimentVariant<Key>,
    };
  }
  return {
    payload: snapshot.payload,
    variant: snapshot.variant as ExperimentVariant<Key>,
  };
}
