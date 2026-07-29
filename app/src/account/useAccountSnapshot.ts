import { useEffect, useState } from "react";

import type {
  AccountModule,
  AccountSnapshot,
} from "./AccountModule";

export function useAccountSnapshot(
  account: AccountModule,
): AccountSnapshot | null {
  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null);

  useEffect(() => {
    let isMounted = true;
    const apply = (next: AccountSnapshot) => {
      if (isMounted) {
        setSnapshot(next);
      }
    };
    const unsubscribe = account.subscribe(apply);
    void account.getSnapshot().then(apply);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [account]);

  return snapshot;
}
