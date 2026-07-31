import {
  createKingstinctHealthKitClient,
  NativeHealthProvider,
} from "@/signals";
import type { HealthKitClient } from "@/signals/health/HealthKitClient";
import { getWalkingSessionController } from "./walkingSessionController";

import {
  createHomeSignalFeed,
  type HomeSignalFeed,
  type WalkingStateSource,
} from "./homeSignalFeed";

export interface NativeHomeSignalClients {
  readonly health: HealthKitClient;
}

/** Both real sensor pipes are selected only by the iOS dev-client root. */
export function createHealthKitHomeSignalFeed(
  clients: NativeHomeSignalClients = createNativeClients(),
  walkingState: WalkingStateSource = getWalkingSessionController(),
): HomeSignalFeed {
  const health = new NativeHealthProvider(clients.health);
  const feed = createHomeSignalFeed({
    health,
    walking: null,
    walkingState,
  });

  return {
    ...feed,
    dispose() {
      feed.dispose();
      health.dispose();
    },
  };
}

function createNativeClients(): NativeHomeSignalClients {
  return {
    health: createKingstinctHealthKitClient(),
  };
}
