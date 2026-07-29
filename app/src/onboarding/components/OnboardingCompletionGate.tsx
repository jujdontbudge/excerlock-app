import { useSyncExternalStore, type ReactNode } from "react";

import { useOnboardingStore } from "../store/onboardingStore";

type OnboardingCompletionGateProps = {
  onboarding: ReactNode;
  app: ReactNode;
  pending?: ReactNode;
};

function subscribeToHydration(onStoreChange: () => void): () => void {
  const unsubscribeHydrate =
    useOnboardingStore.persist.onHydrate(onStoreChange);
  const unsubscribeFinish =
    useOnboardingStore.persist.onFinishHydration(onStoreChange);

  return () => {
    unsubscribeHydrate();
    unsubscribeFinish();
  };
}

function getHydrationSnapshot(): boolean {
  return useOnboardingStore.persist.hasHydrated();
}

/** Holds navigation until persisted progress is known, then selects one branch. */
export function OnboardingCompletionGate({
  onboarding,
  app,
  pending = null,
}: OnboardingCompletionGateProps) {
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydrationSnapshot,
    () => false,
  );
  const isComplete = useOnboardingStore((state) => state.isComplete);

  if (!isHydrated) {
    return pending;
  }

  return isComplete ? app : onboarding;
}
