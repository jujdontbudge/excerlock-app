import { useEffect, useState } from "react";

import { EMPTY_READING, type SignalReading } from "../model/reading";
import type { HomeSignalFeed } from "./homeSignalFeed";

/**
 * Subscribes Home to a feed for as long as it is mounted. The feed itself is
 * owned by whoever created it — the hook starts delivery and stops listening,
 * but never disposes a feed it did not make.
 */
export function useHomeSignals(feed: HomeSignalFeed): SignalReading {
  const [reading, setReading] = useState<SignalReading>(EMPTY_READING);

  useEffect(() => {
    let mounted = true;
    const apply = (next: SignalReading) => {
      if (mounted) {
        setReading(next);
      }
    };

    const unsubscribe = feed.subscribe(apply);
    void feed
      .start()
      .then(() => feed.read())
      .then(apply)
      .catch(() => undefined);

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [feed]);

  return reading;
}
