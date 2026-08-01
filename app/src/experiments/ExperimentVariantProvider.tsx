import type { PostHog } from "posthog-react-native";
import { useFeatureFlag } from "posthog-react-native";
import {
  type ReactNode,
  useMemo,
} from "react";

import { ExperimentContext, type ExperimentSnapshot } from "./experimentContext";
import type { ExperimentFlagKey } from "./experiments";
import { useTimedExperimentVariant } from "./useTimedExperimentVariant";

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
  const snapshot = useMemo<ExperimentSnapshot<Key>>(
    () => ({ flagKey, payload, variant }),
    [flagKey, payload, variant],
  );

  return (
    <ExperimentContext.Provider value={snapshot}>
      {children}
    </ExperimentContext.Provider>
  );
}
