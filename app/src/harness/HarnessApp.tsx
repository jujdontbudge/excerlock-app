import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ComponentType,
} from "react";
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
import type { GaitVisionPreviewProps } from "../../modules/excerlock-gait-vision";
import type { HarnessFootageCapture } from "./HarnessCameraSource";
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
import { createDefaultHarnessSources } from "./createDefaultHarnessSources";
import { parseHarnessLaunchRequest } from "./harnessLaunchRequest";

/**
 * A run screen with no moving parts reads as a printed page: a tester cannot
 * tell a live recording from a frozen one, and stops trusting the harness.
 * Every phase therefore shows a second that changes.
 */
function useTick(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) {
      return;
    }
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function describeTask(definition: HarnessTestDefinition): string {
  const seconds = Math.round(definition.defaultDurationMs / 1000);
  const duration =
    seconds < 60
      ? `${seconds} seconds`
      : `${Math.round(seconds / 60)} minute${seconds >= 120 ? "s" : ""}`;
  const count = definition.markerLabels.length;
  return `${duration} · ${count} button${count === 1 ? "" : "s"} to press`;
}

type HarnessAppProps = Readonly<{
  /** e.g. excerlock://harness?test=c1-treadmill-walking&start=1 */
  launchUrl?: string | null;
  buildCommit?: string;
  CameraPreview?: ComponentType<GaitVisionPreviewProps>;
  footage?: Pick<HarnessFootageCapture, "deleteAll">;
  store?: HarnessRunStore;
  sources?: Partial<Record<HarnessSignalSourceId, HarnessSignalSource>>;
}>;

type Selection =
  | Readonly<{ kind: "tasks" }>
  | Readonly<{ kind: "task"; definition: HarnessTestDefinition; autoStart?: boolean }>
  | Readonly<{ kind: "run"; run: HarnessRun }>;

function selectionForLaunch(launchUrl: string | null | undefined): Selection {
  const request = parseHarnessLaunchRequest(launchUrl);
  const definition = HARNESS_TEST_DEFINITIONS.find(
    (candidate) => candidate.id === request?.testId,
  );
  if (!request || !definition) return { kind: "tasks" };
  return { kind: "task", definition, autoStart: request.autoStart };
}

export function HarnessApp({
  buildCommit = process.env.EXPO_PUBLIC_BUILD_COMMIT ?? "unknown",
  CameraPreview,
  footage,
  launchUrl,
  store: suppliedStore,
  sources,
}: HarnessAppProps) {
  const store = useMemo(
    () => suppliedStore ?? createDefaultHarnessRunStore(footage),
    [footage, suppliedStore],
  );
  const attachedSources = useMemo(
    () => sources ?? createDefaultHarnessSources(),
    [sources],
  );
  const [selection, setSelection] = useState<Selection>(() =>
    selectionForLaunch(launchUrl),
  );

  if (selection.kind === "task") {
    return (
      <HarnessRunScreen
        autoStart={selection.autoStart}
        buildCommit={buildCommit}
        CameraPreview={CameraPreview}
        definition={selection.definition}
        onBack={() => setSelection({ kind: "tasks" })}
        sources={attachedSources}
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
          <Text style={styles.kind}>{describeTask(definition)}</Text>
          <Text style={styles.open}>Open ›</Text>
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
      <ActionButton
        label="Delete all captured footage"
        onPress={async () => {
          await store.deleteAllFootage();
          reload();
        }}
      />
    </ScrollView>
  );
}

function HarnessRunScreen({
  autoStart = false,
  buildCommit,
  CameraPreview,
  definition,
  onBack,
  sources,
  store,
}: Readonly<{
  autoStart?: boolean;
  buildCommit: string;
  CameraPreview?: ComponentType<GaitVisionPreviewProps>;
  definition: HarnessTestDefinition;
  onBack: () => void;
  sources?: Partial<Record<HarnessSignalSourceId, HarnessSignalSource>>;
  store: HarnessRunStore;
}>) {
  const [note, setNote] = useState("");
  const [parameters, setParameters] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (definition.parameters ?? []).map(({ id }) => [id, ""]),
    ),
  );
  const [started, setStarted] = useState(false);
  const engine = useMemo(
    () => new HarnessRunEngine({
      buildCommit,
      now: () => Date.now(),
      recorder: store,
      sources,
    }),
    [buildCommit, sources, store],
  );
  const snapshot = useSyncExternalStore(
    (listener) => engine.subscribe(listener),
    () => engine.getSnapshot(),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" || state === "background" || state === "inactive") {
        void engine.recordAppState(state);
      }
    });
    return () => subscription.remove();
  }, [engine]);

  const now = useTick(
    snapshot.phase === "countdown" || snapshot.phase === "recording",
  );
  const markerPresses = useMemo(() => {
    const pressed = new Map<string, number>();
    for (const event of snapshot.run?.events ?? []) {
      if (event.type === "marker") {
        pressed.set(event.label, event.atMs);
      }
    }
    return pressed;
  }, [snapshot.run]);
  const sourceErrors = useMemo(
    () =>
      (snapshot.run?.events ?? []).filter(
        (event) => event.type === "source-error",
      ),
    [snapshot.run],
  );

  const startRun = () => {
    setStarted(true);
    void engine.start(definition, { parameters, note });
  };
  useEffect(() => {
    if (autoStart) startRun();
    // Launch-url auto start fires once, on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>{definition.title}</Text>
      <Text style={styles.phase}>
        {!started
          ? "Set up run"
          : snapshot.phase === "countdown"
            ? "Countdown"
            : snapshot.phase}
      </Text>
      {snapshot.phase === "countdown" && snapshot.countdownEndsAtMs !== null ? (
        <Text style={styles.clock}>
          {`Starting in ${Math.max(0, Math.ceil((snapshot.countdownEndsAtMs - now) / 1000))}s`}
        </Text>
      ) : null}
      {snapshot.phase === "recording" && snapshot.deadlineMs !== null ? (
        <>
          <Text style={styles.clock}>
            {`${formatClock(snapshot.deadlineMs - now)} left`}
          </Text>
          <Text style={styles.copy}>
            {`Recording · ${formatClock(now - (snapshot.run?.startedAtMs ?? now))} elapsed`}
          </Text>
        </>
      ) : null}
      {definition.handsFreePlan ? (
        <Text style={styles.copy}>{definition.handsFreePlan}</Text>
      ) : null}
      {definition.panel === "camera-preview" && CameraPreview ? (
        <CameraPreview active style={styles.panel} />
      ) : definition.panel ? (
        <View accessibilityLabel={`${definition.panel} panel`} style={styles.panel} />
      ) : null}
      {sourceErrors.map((error, index) => (
        <Text
          accessibilityRole="alert"
          key={`${error.source}-${error.atMs}-${index}`}
          style={styles.error}
        >
          {`${error.source[0].toUpperCase()}${error.source.slice(1)} failed: ${error.message}`}
        </Text>
      ))}
      {!started ? (
        <>
          {(definition.parameters ?? []).map((parameter) => (
            <View key={parameter.id} style={styles.field}>
              <Text style={styles.copy}>
                {parameter.label}{parameter.unit ? ` (${parameter.unit})` : ""}
              </Text>
              <TextInput
                accessibilityLabel={parameter.label}
                keyboardType="decimal-pad"
                onChangeText={(value) =>
                  setParameters((current) => ({
                    ...current,
                    [parameter.id]: value,
                  }))
                }
                style={styles.input}
                value={parameters[parameter.id] ?? ""}
              />
            </View>
          ))}
          <View style={styles.field}>
            <Text style={styles.copy}>Run note</Text>
            <TextInput
              accessibilityLabel="Run note"
              multiline
              onChangeText={setNote}
              style={styles.input}
              value={note}
            />
          </View>
          <ActionButton label="Start run" onPress={startRun} />
          <ActionButton label="Back to tasks" onPress={onBack} tone="quiet" />
        </>
      ) : null}
      {snapshot.phase === "recording"
        ? definition.markerLabels.map((label) => (
            <ActionButton
              key={label}
              label={label}
              note={
                markerPresses.has(label)
                  ? `recorded at ${formatClock(
                      (markerPresses.get(label) ?? 0) -
                        (snapshot.run?.startedAtMs ?? 0),
                    )}`
                  : "not yet pressed"
              }
              onPress={() => engine.pressMarker(label)}
              tone={markerPresses.has(label) ? "done" : "primary"}
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
      <Text style={styles.copy}>Note: {run.note ?? ""}</Text>
      {Object.entries(run.parameters ?? {}).map(([id, value]) => (
        <Text key={id} style={styles.copy}>Parameter {id}: {value}</Text>
      ))}
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
  note,
  onPress,
  tone = "primary",
}: Readonly<{
  disabled?: boolean;
  label: string;
  note?: string;
  onPress: () => void | Promise<void>;
  tone?: "primary" | "done" | "quiet";
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        tone === "done" && styles.buttonDone,
        tone === "quiet" && styles.buttonQuiet,
        disabled && styles.disabled,
      ]}
    >
      <Text style={styles.buttonLabel}>{label}</Text>
      {note === undefined ? null : <Text style={styles.buttonNote}>{note}</Text>}
    </Pressable>
  );
}

async function shareRuns(runs: readonly HarnessRun[]): Promise<void> {
  await Share.share({
    message: serializeHarnessJsonLines(runs),
    title: runs.length === 1 ? runs[0]?.id : "ExcerLock harness runs",
  });
}

function createDefaultHarnessRunStore(
  footage?: Pick<HarnessFootageCapture, "deleteAll">,
): HarnessRunStore {
  const loaded = require(
    "@react-native-async-storage/async-storage"
  ) as typeof import("@react-native-async-storage/async-storage") & {
    default?: DiagnosticsStorage;
  };
  const AsyncStorage = loaded.default ?? (loaded as unknown as DiagnosticsStorage);
  return new HarnessRunStore(AsyncStorage as DiagnosticsStorage, footage);
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    gap: 14,
    padding: 24,
    // The screen has no navigation bar, so the top inset is our own problem:
    // without it the title sits under the notch and the page looks broken.
    paddingTop: 72,
    paddingBottom: 72,
    backgroundColor: "#111827",
  },
  title: { color: "white", fontSize: 28, fontWeight: "700" },
  section: { color: "white", fontSize: 21, fontWeight: "700", marginTop: 14 },
  copy: { color: "#CBD5E1", fontSize: 15 },
  phase: { color: "#93C5FD", fontSize: 18, fontWeight: "700" },
  kind: { color: "#93C5FD", fontSize: 13, marginTop: 6 },
  card: { borderRadius: 12, backgroundColor: "#1E293B", padding: 16 },
  savedRun: { borderRadius: 10, borderWidth: 1, borderColor: "#334155", padding: 14 },
  cardTitle: { color: "white", fontSize: 17, fontWeight: "600" },
  panel: { minHeight: 180, borderRadius: 12, backgroundColor: "#020617" },
  field: { gap: 6 },
  input: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#475569",
    color: "white",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  event: { color: "#E2E8F0", fontFamily: "Courier", fontSize: 13 },
  error: {
    borderRadius: 10,
    backgroundColor: "#7F1D1D",
    color: "white",
    fontSize: 15,
    fontWeight: "700",
    padding: 12,
  },
  clock: { color: "white", fontSize: 44, fontWeight: "800", fontVariant: ["tabular-nums"] },
  open: { color: "#93C5FD", fontSize: 13, fontWeight: "700", marginTop: 8 },
  button: { minHeight: 64, gap: 2, borderRadius: 12, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center", paddingHorizontal: 16, paddingVertical: 12 },
  buttonDone: { backgroundColor: "#166534" },
  buttonQuiet: { backgroundColor: "#1E293B" },
  buttonNote: { color: "#DBEAFE", fontSize: 13 },
  disabled: { opacity: 0.4 },
  buttonLabel: { color: "white", fontSize: 16, fontWeight: "700" },
});
