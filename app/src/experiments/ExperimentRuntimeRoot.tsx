import type { PostHog } from "posthog-react-native";
import type { ReactNode } from "react";

import { getActivePostHogClient } from "../analytics";
import { ExperimentVariantProvider } from "./ExperimentVariantProvider";

export interface ExperimentRuntimeRootProps {
  children: ReactNode;
  client?: PostHog | null;
}

/** Mounts the one app-wide shield-copy exposure reader when PostHog is live. */
export function ExperimentRuntimeRoot({
  children,
  client = getActivePostHogClient() as unknown as PostHog | null,
}: ExperimentRuntimeRootProps) {
  if (!client) {
    return children;
  }
  return (
    <ExperimentVariantProvider
      client={client}
      flagKey="exp-shield-copy-v1"
    >
      {children}
    </ExperimentVariantProvider>
  );
}
