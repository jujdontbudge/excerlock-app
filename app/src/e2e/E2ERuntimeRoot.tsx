import { useLinkingURL } from "expo-linking";
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

import { E2EScenarioGate } from "./E2EScenarioGate";
import type { LoadedScenario } from "./scenarioDeepLink";

export type E2ERuntimeRootProps = Readonly<{
  children: ReactNode;
}>;

/** Build-gated owner of URL selection and all five fixture providers. */
export function E2ERuntimeRoot({
  children,
}: E2ERuntimeRootProps) {
  const url = useLinkingURL();
  const router = useRouter();
  const uninstallHomeRuntime = useRef<(() => void) | null>(null);

  const handleLoaded = useCallback(
    (loaded: LoadedScenario) => {
      uninstallHomeRuntime.current?.();
      const { health, motion } = loaded.composition.providers;
      uninstallHomeRuntime.current = installHomeAppRuntime({
        feed: createHomeSignalFeed({ health, motion }),
        now: () => loaded.composition.clock.nowMs(),
      });
      router.replace("/");
    },
    [router],
  );

  useEffect(
    () => () => {
      uninstallHomeRuntime.current?.();
    },
    [],
  );

  return (
    <E2EScenarioGate url={url} onLoaded={handleLoaded}>
      {children}
    </E2EScenarioGate>
  );
}
