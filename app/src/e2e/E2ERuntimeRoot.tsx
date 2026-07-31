import { useRouter } from "expo-router";
import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

import {
  createHomeSignalFeed,
  installHomeAppRuntime,
  useHomeStore,
} from "@/home";
import {
  installWalkingSessionController,
  WalkingSessionController,
} from "@/home/signals/walkingSessionController";
import {
  GymPresenceController,
  installGymPresenceController,
} from "@/home/signals/gymPresenceController";
import { installLockAppRuntime } from "@/lock";
import { useSettingsStore } from "@/settings/store/settingsStore";
import { installScreenTimeAppRuntime } from "@/screentime";
import {
  installFixtureSubscriptionModule,
} from "@/subscription/accessor";
import { installFixtureSupportModule } from "@/support";

import { E2EScenarioGate } from "./E2EScenarioGate";
import { useScenarioUrl } from "./scenarioUrlSource";
import type { LoadedScenario } from "./scenarioDeepLink";

export type E2ERuntimeRootProps = Readonly<{
  children: ReactNode;
}>;

/** Build-gated owner of URL selection and all five fixture providers. */
export function E2ERuntimeRoot({
  children,
}: E2ERuntimeRootProps) {
  const url = useScenarioUrl();
  const router = useRouter();
  const uninstallHomeRuntime = useRef<(() => void) | null>(null);
  const uninstallLockRuntime = useRef<(() => void) | null>(null);
  const uninstallWalkingSession = useRef<(() => void) | null>(null);
  const uninstallGymPresence = useRef<(() => void) | null>(null);
  const uninstallScreenTimeRuntime = useRef<(() => void) | null>(null);
  const uninstallSubscriptionModule =
    useRef<(() => void) | null>(null);
  const uninstallSupportModule = useRef<(() => void) | null>(null);

  const handleLoaded = useCallback(
    (loaded: LoadedScenario) => {
      uninstallHomeRuntime.current?.();
      const { health, location, motion } = loaded.composition.providers;
      uninstallHomeRuntime.current = installHomeAppRuntime({
        feed: createHomeSignalFeed({ health, motion, walking: null }),
        now: () => loaded.composition.clock.nowMs(),
      });
      uninstallLockRuntime.current?.();
      uninstallLockRuntime.current = installLockAppRuntime({
        now: () => loaded.composition.clock.nowMs(),
      });
      uninstallScreenTimeRuntime.current?.();
      uninstallScreenTimeRuntime.current = installScreenTimeAppRuntime({
        clock: loaded.composition.clock,
      });
      uninstallWalkingSession.current?.();
      uninstallWalkingSession.current = installWalkingSessionController(
        new WalkingSessionController({
          createMotion: () => motion,
          getLocation: () => location,
          getState: () => useHomeStore.getState(),
          now: () => motion.currentTimeMs,
          wallClockNow: () => loaded.composition.clock.nowMs(),
        }),
      );
      uninstallGymPresence.current?.();
      uninstallGymPresence.current = installGymPresenceController(
        new GymPresenceController({
          getState: () => ({
            ...useHomeStore.getState(),
            autoDetectEnabled:
              useSettingsStore.getState().gymAutoDetectEnabled,
          }),
          getLocation: () => location,
          now: () => loaded.composition.clock.nowMs(),
          recordEventPayout: (conditionId, atMs) => {
            useHomeStore.getState().recordEventPayout(conditionId, atMs);
          },
          setAutoDetectEnabled: (enabled) => {
            useSettingsStore.getState().setGymAutoDetectEnabled(enabled);
          },
          toLedgerTime: () => loaded.composition.clock.nowMs(),
        }),
      );
      uninstallSubscriptionModule.current?.();
      uninstallSubscriptionModule.current =
        installFixtureSubscriptionModule({
          entitlement: loaded.state.entitlement,
          clock: loaded.composition.clock,
        });
      uninstallSupportModule.current?.();
      uninstallSupportModule.current = installFixtureSupportModule({
        clock: loaded.composition.clock,
      });
      router.replace("/");
    },
    [router],
  );

  useEffect(
    () => () => {
      uninstallHomeRuntime.current?.();
      uninstallLockRuntime.current?.();
      uninstallWalkingSession.current?.();
      uninstallGymPresence.current?.();
      uninstallScreenTimeRuntime.current?.();
      uninstallSubscriptionModule.current?.();
      uninstallSupportModule.current?.();
    },
    [],
  );

  return (
    <E2EScenarioGate url={url} onLoaded={handleLoaded}>
      {children}
    </E2EScenarioGate>
  );
}
