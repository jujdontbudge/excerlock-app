import type { PostHog } from "posthog-react-native";
import { useFeatureFlag } from "posthog-react-native";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  type ExperimentFlagKey,
  type ExperimentVariant,
  resolveOnTimeVariant,
} from "./experiments";
import {
  decodeShieldCopyPayload,
  type ShieldCopyPayload,
} from "./shieldCopyPayload";

type Clock = () => number;

type ExperimentSnapshot = {
  flagKey: ExperimentFlagKey;
  payload: unknown;
  variant: string;
};

const ExperimentContext = createContext<ExperimentSnapshot | null>(null);

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

export interface ExperimentVariantProviderProps<Key extends ExperimentFlagKey> {
  children: ReactNode;
  client: PostHog;
  flagKey: Key;
}

/** The sole exposure-emitting feature-flag reader in the app. */
export function ExperimentVariantProvider<Key extends ExperimentFlagKey>({
  children,
  client,
  flagKey,
}: ExperimentVariantProviderProps<Key>) {
  const observed = useFeatureFlag(flagKey, client);
  const variant = useTimedExperimentVariant(flagKey, observed);
  const payload = variant === "control"
    ? null
    : client.getFeatureFlagPayload(flagKey);
  const snapshot = useMemo<ExperimentSnapshot>(
    () => ({ flagKey, payload, variant }),
    [flagKey, payload, variant],
  );

  return (
    <ExperimentContext.Provider value={snapshot}>
      {children}
    </ExperimentContext.Provider>
  );
}

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
