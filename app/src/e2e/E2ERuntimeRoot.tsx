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
} from "@/home";
import { installLockAppRuntime } from "@/lock";
import {
  installFixtureSubscriptionModule,
} from "@/subscription/accessor";

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
  const uninstallSubscriptionModule =
    useRef<(() => void) | null>(null);

  const handleLoaded = useCallback(
    (loaded: LoadedScenario) => {
      uninstallHomeRuntime.current?.();
      const { health, motion } = loaded.composition.providers;
      uninstallHomeRuntime.current = installHomeAppRuntime({
        feed: createHomeSignalFeed({ health, motion }),
        now: () => loaded.composition.clock.nowMs(),
      });
      uninstallLockRuntime.current?.();
      uninstallLockRuntime.current = installLockAppRuntime({
        now: () => loaded.composition.clock.nowMs(),
      });
      uninstallSubscriptionModule.current?.();
      uninstallSubscriptionModule.current =
        installFixtureSubscriptionModule({
          entitlement: loaded.state.entitlement,
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
      uninstallSubscriptionModule.current?.();
    },
    [],
  );

  return (
    <E2EScenarioGate url={url} onLoaded={handleLoaded}>
      {children}
    </E2EScenarioGate>
  );
}
