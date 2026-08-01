import { createContext } from "react";

import type {
  ExperimentFlagKey,
  ExperimentVariant,
} from "./experiments";

export type ExperimentSnapshot<Key extends ExperimentFlagKey = ExperimentFlagKey> = {
  flagKey: Key;
  payload: unknown;
  variant: ExperimentVariant<Key>;
};

export const ExperimentContext = createContext<ExperimentSnapshot | null>(null);
