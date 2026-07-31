import {
  createExcerlockMotionModuleClient,
  createKingstinctHealthKitClient,
  NativeHealthProvider,
  NativeMotionProvider,
  type ExcerlockMotionModuleClient,
} from "@/signals";
import type { HealthKitClient } from "@/signals/health/HealthKitClient";

import { createHomeSignalFeed, type HomeSignalFeed } from "./homeSignalFeed";

export interface NativeHomeSignalClients {
  readonly health: HealthKitClient;
  readonly motion: ExcerlockMotionModuleClient;
}

/** Both real sensor pipes are selected only by the iOS dev-client root. */
export function createHealthKitHomeSignalFeed(
  clients: NativeHomeSignalClients = createNativeClients(),
): HomeSignalFeed {
  const health = new NativeHealthProvider(clients.health);
  const motion = new NativeMotionProvider(clients.motion);
  const feed = createHomeSignalFeed({ health, motion });

  return {
    ...feed,
    dispose() {
      feed.dispose();
      health.dispose();
      motion.dispose();
    },
  };
}

function createNativeClients(): NativeHomeSignalClients {
  return {
    health: createKingstinctHealthKitClient(),
    motion: createExcerlockMotionModuleClient(),
  };
}
