import { useEffect, useState } from "react";

import type { NotificationTypeId } from "../model/catalog";
import type {
  NotificationAuthorizationStatus,
  NotificationModule,
} from "../NotificationModule";

export function useNotificationPermission(
  module: NotificationModule,
  onApproved: (typeId: NotificationTypeId) => void,
) {
  const [authorization, setAuthorization] =
    useState<NotificationAuthorizationStatus>("notDetermined");
  const [ready, setReady] = useState(false);
  const [pendingTypeId, setPendingTypeId] =
    useState<NotificationTypeId | null>(null);

  useEffect(() => {
    let mounted = true;
    void module
      .getAuthorizationStatus()
      .then((status) => {
        if (mounted) {
          setAuthorization(status);
        }
      })
      .catch(() => {
        // Stay "notDetermined": the opt-in flow re-asks natively on demand,
        // which doubles as the retry path.
      })
      .finally(() => {
        if (mounted) {
          setReady(true);
        }
      });
    return () => {
      mounted = false;
    };
  }, [module]);

  const beginOptIn = (typeId: NotificationTypeId) => {
    if (authorization === "approved") {
      onApproved(typeId);
    } else if (authorization === "notDetermined") {
      setPendingTypeId(typeId);
    }
  };

  const requestAuthorization = async () => {
    try {
      const status = await module.requestAuthorization();
      setAuthorization(status);
      if (status === "approved" && pendingTypeId !== null) {
        onApproved(pendingTypeId);
      }
    } catch {
      // Leave authorization as-is; the primer closes below so the user can
      // try again instead of facing a stuck sheet.
    }
    setPendingTypeId(null);
  };

  return {
    authorization,
    ready,
    primerVisible: pendingTypeId !== null,
    beginOptIn,
    cancelPrimer: () => setPendingTypeId(null),
    requestAuthorization,
  };
}
