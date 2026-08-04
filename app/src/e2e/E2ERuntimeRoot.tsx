import { useRouter } from "expo-router";
import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

import { installAnalysisClock } from "@/analysis";
import {
  createHomeSignalFeed,
  installHomeAppRuntime,
  useHomeStore,
} from "@/home";
import {
  GymPresenceController,
  installGymPresenceController,
  installWalkingSessionController,
  WalkingSessionController,
} from "@/home/signals";
import {
  installLockAppRuntime,
  installLockController,
  LockController,
} from "@/lock";
import { useSettingsStore } from "@/settings";
import {
  installScreenTimeAppRuntime,
  installScreenTimeModule,
} from "@/screentime";
import { screenTimeAppClock } from "@/screentime/appRuntime";
// Composition-root exemption from the index-only law: this build-gated root
// composes implementations the way the accessor itself does.
import { MockScreenTimeModule } from "@/screentime/MockScreenTimeModule";
import {
  installFixtureSubscriptionModule,
} from "@/subscription/accessor";
import { installFixtureSupportModule } from "@/support";

import { E2EScenarioGate } from "./E2EScenarioGate";
import { useScenarioUrl } from "./scenarioUrlSource";
import type { LoadedScenario } from "./scenarioDeepLink";

export type E2ERuntimeRootProps = Readonly<{
  children: ReactNode;
  onScenarioLoaded?: (loaded: LoadedScenario) => void;
}>;

/** Build-gated owner of URL selection and all five fixture providers. */
export function E2ERuntimeRoot({
  children,
  onScenarioLoaded,
}: E2ERuntimeRootProps) {
  const url = useScenarioUrl();
  const router = useRouter();
  const uninstallHomeRuntime = useRef<(() => void) | null>(null);
  const uninstallLockRuntime = useRef<(() => void) | null>(null);
  const uninstallWalkingSession = useRef<(() => void) | null>(null);
  const uninstallGymPresence = useRef<(() => void) | null>(null);
  const uninstallScreenTimeRuntime = useRef<(() => void) | null>(null);
  const uninstallScreenTimeModule = useRef<(() => void) | null>(null);
  const uninstallLockController = useRef<(() => void) | null>(null);
  const uninstallAnalysisClock = useRef<(() => void) | null>(null);
  const uninstallSubscriptionModule =
    useRef<(() => void) | null>(null);
  const uninstallSupportModule = useRef<(() => void) | null>(null);

  const handleLoaded = useCallback(
    (loaded: LoadedScenario) => {
      uninstallHomeRuntime.current?.();
      const { health, location, motion } = loaded.composition.providers;
      // Constructed before the feed so the feed can read walking through it —
      // production wires walkingState the same way (healthKitFeed.ts). With
      // walking: null and no walkingState, activeSignals can never contain
      // "walking" and the hold state is unreachable in every scenario.
      const walkingSession = new WalkingSessionController({
        createMotion: () => motion,
        getLocation: () => location,
        getState: () => useHomeStore.getState(),
        now: () => motion.currentTimeMs,
        wallClockNow: () => loaded.composition.clock.nowMs(),
      });
      uninstallHomeRuntime.current = installHomeAppRuntime({
        feed: createHomeSignalFeed({
          health,
          motion,
          walking: null,
          walkingState: walkingSession,
        }),
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
      uninstallAnalysisClock.current?.();
      uninstallAnalysisClock.current = installAnalysisClock({
        nowMs: () => loaded.composition.clock.nowMs(),
      });
      uninstallScreenTimeModule.current?.();
      // The OS boundary is scenario-owned like every other fixture. Default is
      // the mock (all #77 flows assume its canned selection and drivable
      // shield state); only a scenario declaring "native" keeps the real
      // FamilyControls adapter.
      uninstallScreenTimeModule.current =
        loaded.manifest.state.shield.screenTimeModule === "native"
          ? null
          : installScreenTimeModule(
              new MockScreenTimeModule({ clock: screenTimeAppClock }),
            );
      uninstallWalkingSession.current?.();
      uninstallWalkingSession.current =
        installWalkingSessionController(walkingSession);
      // Constructed only after the ScreenTime module and walking session
      // above are in place: the controller captures both at construction, and
      // a startup-constructed controller would keep driving the launch-time
      // OS boundary underneath the scenario's fixtures.
      uninstallLockController.current?.();
      uninstallLockController.current = installLockController(
        new LockController(),
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
      onScenarioLoaded?.(loaded);
      router.replace("/");
    },
    [onScenarioLoaded, router],
  );

  useEffect(
    () => () => {
      uninstallHomeRuntime.current?.();
      uninstallLockRuntime.current?.();
      uninstallWalkingSession.current?.();
      uninstallGymPresence.current?.();
      uninstallScreenTimeRuntime.current?.();
      uninstallScreenTimeModule.current?.();
      uninstallLockController.current?.();
      uninstallAnalysisClock.current?.();
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
