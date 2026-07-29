import { useEffect, useState } from "react";
import type { PaywallPlacement } from "@excerlock/analytics-events";

import type {
  SubscriptionModule,
  SubscriptionSnapshot,
} from "./SubscriptionModule";

export function useSubscriptionSnapshot(
  subscription: SubscriptionModule,
  placement: PaywallPlacement,
): SubscriptionSnapshot | null {
  const [snapshot, setSnapshot] = useState<SubscriptionSnapshot | null>(null);

  useEffect(() => {
    let isMounted = true;
    const apply = (next: SubscriptionSnapshot) => {
      if (isMounted) {
        setSnapshot(next);
      }
    };
    const unsubscribe = subscription.subscribe(apply);

    void (async () => {
      apply(await subscription.getSnapshot());
      await subscription.loadPaywall(placement);
    })();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [placement, subscription]);

  return snapshot;
}
