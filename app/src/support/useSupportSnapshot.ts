import { useEffect, useState } from "react";

import type { SupportModule, SupportSnapshot } from "./SupportModule";

export function useSupportSnapshot(
  support: SupportModule,
): SupportSnapshot | null {
  const [snapshot, setSnapshot] = useState<SupportSnapshot | null>(null);

  useEffect(() => {
    let isMounted = true;
    const apply = (next: SupportSnapshot) => {
      if (isMounted) {
        setSnapshot(next);
      }
    };
    const unsubscribe = support.subscribe(apply);
    void support.getSnapshot().then(apply);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [support]);

  return snapshot;
}
