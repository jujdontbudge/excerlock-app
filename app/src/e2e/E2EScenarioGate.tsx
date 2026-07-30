import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Text, View } from "react-native";

import {
  loadScenarioDeepLink,
  type LoadedScenario,
} from "./scenarioDeepLink";
import { matchScenarioDeepLink } from "./scenarioUrl";

type GateState =
  | Readonly<{ status: "idle"; url: string | null }>
  | Readonly<{ status: "loading"; url: string }>
  | Readonly<{
      status: "ready";
      url: string;
      loaded: LoadedScenario;
    }>
  | Readonly<{ status: "error"; url: string; message: string }>;

export type E2EScenarioGateProps = Readonly<{
  children: ReactNode;
  url: string | null;
  onLoaded?: (loaded: LoadedScenario) => void;
}>;

export function E2EScenarioGate({
  children,
  url,
  onLoaded,
}: E2EScenarioGateProps) {
  const [state, setState] = useState<GateState>({
    status: isScenarioDeepLink(url) ? "loading" : "idle",
    url,
  } as GateState);
  const loadedRef = useRef<LoadedScenario | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!isScenarioDeepLink(url)) {
      setState({ status: "idle", url });
      return;
    }

    setState({ status: "loading", url });
    void loadScenarioDeepLink(url).then(
      (loaded) => {
        if (loaded === null) {
          return;
        }
        if (cancelled) {
          loaded.composition.dispose();
          return;
        }
        loadedRef.current?.composition.dispose();
        loadedRef.current = loaded;
        onLoaded?.(loaded);
        setState({ status: "ready", url, loaded });
      },
      (error: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            url,
            message: `E2E scenario "${scenarioName(url)}" failed to load: ${
              error instanceof Error ? error.message : String(error)
            }`,
          });
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [onLoaded, url]);

  useEffect(
    () => () => {
      loadedRef.current?.composition.dispose();
    },
    [],
  );

  if (isScenarioDeepLink(url) && state.url !== url) {
    return null;
  }
  if (state.status === "loading") {
    return null;
  }
  if (state.status === "error") {
    return (
      <View
        testID="screen-e2e-error"
        style={{
          alignItems: "center",
          flex: 1,
          gap: 12,
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Text accessibilityRole="header">E2E scenario failed</Text>
        <Text selectable>{state.message}</Text>
      </View>
    );
  }
  return children;
}

function isScenarioDeepLink(url: string | null): url is string {
  return matchScenarioDeepLink(url) !== null;
}

function scenarioName(url: string): string {
  const encoded = (matchScenarioDeepLink(url) ?? "").split(/[?#]/, 1)[0];
  try {
    return decodeURIComponent(encoded ?? "");
  } catch {
    return encoded ?? "";
  }
}
