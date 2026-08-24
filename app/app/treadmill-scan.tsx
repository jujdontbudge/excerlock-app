import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo } from "react";

import { getWalkingSessionController } from "@/home/signals";
import { TreadmillScanController } from "@/home/treadmill/TreadmillScanController";
import { TreadmillScanCoordinator } from "@/home/treadmill/TreadmillScanCoordinator";
import { TreadmillScanScreen } from "@/home/treadmill/TreadmillScanScreen";
import { createTreadmillScanRuntime } from "@/home/treadmill/treadmillScanRuntime";

export default function TreadmillScanRoute() {
  const params = useLocalSearchParams<{ conditionId?: string | string[] }>();
  const router = useRouter();
  const conditionId = firstParam(params.conditionId);
  const session = getWalkingSessionController();
  const runtime = useMemo(() => createTreadmillScanRuntime(), []);
  const coordinator = useMemo(
    () => new TreadmillScanCoordinator(conditionId ?? "", session, router),
    [conditionId, router, session],
  );
  const source = useMemo(
    () =>
      new TreadmillScanController({
        provider: runtime.provider,
        now: Date.now,
        onVerified: () => coordinator.verified(),
        onPermissionDenied: () => coordinator.permissionDenied(),
        onExpired: () => coordinator.expired(),
      }),
    [coordinator, runtime.provider],
  );

  useEffect(() => {
    if (conditionId === undefined) {
      router.replace("/");
    }
  }, [conditionId, router]);

  if (conditionId === undefined) {
    return null;
  }

  return (
    <TreadmillScanScreen
      source={source}
      Preview={runtime.Preview}
      onContinueHandheld={() => coordinator.continueHandheld()}
    />
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first === undefined || first.length === 0 ? undefined : first;
}
