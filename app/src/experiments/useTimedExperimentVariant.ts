import { useEffect, useRef, useState } from "react";

import {
  type ExperimentFlagKey,
  type ExperimentVariant,
  resolveOnTimeVariant,
} from "./experiments";

type Clock = () => number;

export function useTimedExperimentVariant<Key extends ExperimentFlagKey>(
  flagKey: Key,
  observed: unknown,
  now: Clock = Date.now,
): ExperimentVariant<Key> {
  const startedAt = useRef<number | null>(null);
  if (startedAt.current === null) {
    startedAt.current = now();
  }
  const [variant, setVariant] = useState<ExperimentVariant<Key>>(
    "control" as ExperimentVariant<Key>,
  );

  useEffect(() => {
    if (variant !== "control") {
      return;
    }
    const selected = resolveOnTimeVariant(
      flagKey,
      observed,
      now() - (startedAt.current ?? now()),
    );
    if (selected !== "control") {
      setVariant(selected);
    }
  }, [flagKey, now, observed, variant]);

  return variant;
}
