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
    void module.getAuthorizationStatus().then((status) => {
      if (mounted) {
        setAuthorization(status);
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
    const status = await module.requestAuthorization();
    setAuthorization(status);
    if (status === "approved" && pendingTypeId !== null) {
      onApproved(pendingTypeId);
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
