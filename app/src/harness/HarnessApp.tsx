import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  AppState,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { DiagnosticsStorage } from "@/diagnostics/DiagnosticsLog";
import {
  HarnessRunEngine,
  type HarnessRun,
  type HarnessSignalSource,
  type HarnessSignalSourceId,
  type HarnessTestDefinition,
} from "./HarnessRunEngine";
import {
  HarnessRunStore,
  serializeHarnessJsonLines,
} from "./HarnessRunStore";
import { HARNESS_TEST_DEFINITIONS } from "./testDefinitions";

type HarnessAppProps = Readonly<{
  buildCommit?: string;
  store?: HarnessRunStore;
  sources?: Partial<Record<HarnessSignalSourceId, HarnessSignalSource>>;
}>;

type Selection =
  | Readonly<{ kind: "tasks" }>
  | Readonly<{ kind: "task"; definition: HarnessTestDefinition }>
  | Readonly<{ kind: "run"; run: HarnessRun }>;

export function HarnessApp({
  buildCommit = process.env.EXPO_PUBLIC_BUILD_COMMIT ?? "unknown",
  store: suppliedStore,
  sources,
}: HarnessAppProps) {
  const store = useMemo(
    () => suppliedStore ?? createDefaultHarnessRunStore(),
    [suppliedStore],
  );
  const [selection, setSelection] = useState<Selection>({ kind: "tasks" });

  if (selection.kind === "task") {
    return (
      <HarnessRunScreen
        buildCommit={buildCommit}
        definition={selection.definition}
        onBack={() => setSelection({ kind: "tasks" })}
        sources={sources}
        store={store}
      />
    );
  }
  if (selection.kind === "run") {
    return (
      <SavedRunScreen
        run={selection.run}
        onBack={() => setSelection({ kind: "tasks" })}
      />
    );
  }
  return (
    <TaskList
      store={store}
      onSelectRun={(run) => setSelection({ kind: "run", run })}
      onSelectTask={(definition) => setSelection({ kind: "task", definition })}
    />
  );
}

function TaskList({
  onSelectRun,
  onSelectTask,
  store,
}: Readonly<{
  onSelectRun: (run: HarnessRun) => void;
  onSelectTask: (definition: HarnessTestDefinition) => void;
  store: HarnessRunStore;
}>) {
  const [runs, setRuns] = useState<readonly HarnessRun[]>([]);
  const reload = useCallback(() => {
    void store.list().then(setRuns);
  }, [store]);
  useEffect(reload, [reload]);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>Physical test tasks</Text>
      <Text style={styles.copy}>No verdicts. Every task records evidence only.</Text>
      {HARNESS_TEST_DEFINITIONS.map((definition) => (
        <Pressable
          accessibilityRole="button"
          key={definition.id}
          onPress={() => onSelectTask(definition)}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>{definition.title}</Text>
          <Text style={styles.kind}>{definition.kind}</Text>
        </Pressable>
      ))}
      <Text style={styles.section}>Saved runs</Text>
      {runs.length === 0 ? <Text style={styles.copy}>No runs yet.</Text> : null}
      {runs.map((run) => (
        <Pressable
          accessibilityRole="button"
          key={run.id}
          onPress={() => onSelectRun(run)}
          style={styles.savedRun}
        >
          <Text style={styles.cardTitle}>{run.id}</Text>
          <Text style={styles.copy}>{run.endReason ?? "in progress"}</Text>
        </Pressable>
      ))}
      <ActionButton
        disabled={runs.length === 0}
        label="Export all runs"
        onPress={() => shareRuns(runs)}
      />
    </ScrollView>
  );
}

function HarnessRunScreen({
  buildCommit,
  definition,
  onBack,
  sources,
  store,
}: Readonly<{
  buildCommit: string;
  definition: HarnessTestDefinition;
  onBack: () => void;
  sources?: Partial<Record<HarnessSignalSourceId, HarnessSignalSource>>;
  store: HarnessRunStore;
}>) {
  const engine = useMemo(
    () => new HarnessRunEngine({ buildCommit, now: () => Date.now(), recorder: store, sources }),
    [buildCommit, sources, store],
  );
  const snapshot = useSyncExternalStore(
    (listener) => engine.subscribe(listener),
    () => engine.getSnapshot(),
  );

  useEffect(() => {
    void engine.start(definition);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" || state === "background" || state === "inactive") {
        void engine.recordAppState(state);
      }
    });
    return () => subscription.remove();
  }, [definition, engine]);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>{definition.title}</Text>
      <Text style={styles.phase}>
        {snapshot.phase === "countdown" ? "Countdown" : snapshot.phase}
      </Text>
      {definition.panel ? (
        <View accessibilityLabel={`${definition.panel} panel`} style={styles.panel} />
      ) : null}
      {snapshot.phase === "recording"
        ? definition.markerLabels.map((label) => (
            <ActionButton
              key={label}
              label={label}
              onPress={() => engine.pressMarker(label)}
            />
          ))
        : null}
      {snapshot.phase === "recording" ? (
        <>
          <ActionButton label="Extend 30 seconds" onPress={() => engine.extend(30_000)} />
          <ActionButton label="Stop run" onPress={() => engine.stop()} />
        </>
      ) : null}
      {snapshot.phase === "finished" ? (
        <ActionButton label="Back to tasks" onPress={onBack} />
      ) : null}
    </ScrollView>
  );
}

function SavedRunScreen({ run, onBack }: Readonly<{ run: HarnessRun; onBack: () => void }>) {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>{run.id}</Text>
      <Text style={styles.copy}>Test: {run.testId}</Text>
      <Text style={styles.copy}>Build: {run.buildCommit}</Text>
      <Text style={styles.copy}>Ended: {run.endReason ?? "in progress"}</Text>
      {run.events.map((event, index) => (
        <Text key={`${event.atMs}-${index}`} style={styles.event}>
          {event.type === "marker"
            ? `${event.label} @ ${event.atMs}`
            : `${event.type} @ ${event.atMs}`}
        </Text>
      ))}
      <ActionButton label="Export run" onPress={() => shareRuns([run])} />
      <ActionButton label="Back to tasks" onPress={onBack} />
    </ScrollView>
  );
}

function ActionButton({
  disabled = false,
  label,
  onPress,
}: Readonly<{
  disabled?: boolean;
  label: string;
  onPress: () => void | Promise<void>;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.disabled]}
    >
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

async function shareRuns(runs: readonly HarnessRun[]): Promise<void> {
  await Share.share({
    message: serializeHarnessJsonLines(runs),
    title: runs.length === 1 ? runs[0]?.id : "ExcerLock harness runs",
  });
}

function createDefaultHarnessRunStore(): HarnessRunStore {
  const loaded = require(
    "@react-native-async-storage/async-storage"
  ) as typeof import("@react-native-async-storage/async-storage") & {
    default?: DiagnosticsStorage;
  };
  const AsyncStorage = loaded.default ?? (loaded as unknown as DiagnosticsStorage);
  return new HarnessRunStore(AsyncStorage as DiagnosticsStorage);
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, gap: 14, padding: 24, backgroundColor: "#111827" },
  title: { color: "white", fontSize: 28, fontWeight: "700" },
  section: { color: "white", fontSize: 21, fontWeight: "700", marginTop: 14 },
  copy: { color: "#CBD5E1", fontSize: 15 },
  phase: { color: "#93C5FD", fontSize: 18, fontWeight: "700" },
  kind: { color: "#93C5FD", fontSize: 13, marginTop: 6 },
  card: { borderRadius: 12, backgroundColor: "#1E293B", padding: 16 },
  savedRun: { borderRadius: 10, borderWidth: 1, borderColor: "#334155", padding: 14 },
  cardTitle: { color: "white", fontSize: 17, fontWeight: "600" },
  panel: { minHeight: 180, borderRadius: 12, backgroundColor: "#020617" },
  event: { color: "#E2E8F0", fontFamily: "Courier", fontSize: 13 },
  button: { minHeight: 50, borderRadius: 12, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  disabled: { opacity: 0.4 },
  buttonLabel: { color: "white", fontSize: 16, fontWeight: "700" },
});
