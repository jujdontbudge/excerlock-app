import {
  createExcerlockMotionModuleClient,
  createKingstinctHealthKitClient,
  NativeHealthProvider,
  NativeMotionProvider,
  type ExcerlockMotionModuleClient,
} from "@/signals";
import type { HealthKitClient } from "@/signals/health/HealthKitClient";

import {
  createHomeSignalFeed,
  type HomeSignalFeed,
  type WalkingVerificationOptions,
} from "./homeSignalFeed";

export interface NativeHomeSignalClients {
  readonly health: HealthKitClient;
  readonly motion: ExcerlockMotionModuleClient;
}

/** Both real sensor pipes are selected only by the iOS dev-client root. */
export function createHealthKitHomeSignalFeed(
  clients: NativeHomeSignalClients = createNativeClients(),
  walking: WalkingVerificationOptions | null = createWalkingVerification(),
): HomeSignalFeed {
  const health = new NativeHealthProvider(clients.health);
  const motion = new NativeMotionProvider(clients.motion);
  const feed = createHomeSignalFeed({ health, motion, walking });

  return {
    ...feed,
    dispose() {
      feed.dispose();
      health.dispose();
      motion.dispose();
    },
  };
}

function createWalkingVerification(): WalkingVerificationOptions | null {
  const { useSettingsStore } = require("@/settings/store/settingsStore") as {
    useSettingsStore: {
      getState(): { walkAndScrollGracePeriodSeconds: number | null };
    };
  };
  const gracePeriodSeconds = useSettingsStore.getState()
    .walkAndScrollGracePeriodSeconds;
  return gracePeriodSeconds === null
    ? null
    : { gracePeriodMs: gracePeriodSeconds * 1_000, now: Date.now };
}

function createNativeClients(): NativeHomeSignalClients {
  return {
    health: createKingstinctHealthKitClient(),
    motion: createExcerlockMotionModuleClient(),
  };
}
