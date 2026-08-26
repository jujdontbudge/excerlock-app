export type HarnessTaskKind =
  | "declare-truth"
  | "observe-outcome"
  | "acts-on-device";

export type HarnessSignalSourceId = "motion" | "placement" | "camera";

const ALWAYS_ON_SIGNAL_SOURCES: readonly HarnessSignalSourceId[] = [
  "motion",
  "placement",
];

export interface HarnessTestDefinition {
  readonly id: string;
  readonly title: string;
  readonly kind: HarnessTaskKind;
  readonly countdownMs: number;
  readonly defaultDurationMs: number;
  readonly markerLabels: readonly string[];
  readonly signalSources: readonly HarnessSignalSourceId[];
  readonly panel?: string;
  readonly handsFreePlan?: string;
}

export type HarnessRunEndReason = "timeout" | "stopped";

export type HarnessRunEvent =
  | Readonly<{ type: "marker"; atMs: number; label: string }>
  | Readonly<{
      type: "signal";
      atMs: number;
      source: HarnessSignalSourceId;
      track: string;
      payload: Readonly<Record<string, unknown>>;
    }>
  | Readonly<{
      type: "source-error";
      atMs: number;
      source: HarnessSignalSourceId;
      message: string;
    }>
  | Readonly<{
      type: "app-state";
      atMs: number;
      state: "active" | "background" | "inactive";
    }>
  | Readonly<{
      type: "extension";
      atMs: number;
      durationMs: number;
    }>;

export interface HarnessRun {
  readonly version: 1;
  readonly id: string;
  readonly testId: string;
  readonly buildCommit: string;
  readonly startedAtMs: number;
  readonly endedAtMs?: number;
  readonly endReason?: HarnessRunEndReason;
  readonly footage?: Readonly<{ fileUri: string }>;
  readonly events: readonly HarnessRunEvent[];
}

export interface HarnessRunRecorder {
  save(run: HarnessRun): Promise<void>;
}

export interface HarnessSignalRecorder {
  record(track: string, payload: Readonly<Record<string, unknown>>): void;
}

export interface HarnessSignalSource {
  readonly id: HarnessSignalSourceId;
  prepare?(context: HarnessSignalPreparationContext): Promise<void>;
  start(recorder: HarnessSignalRecorder): Promise<void>;
  stop(): Promise<void>;
}

export interface HarnessSignalPreparationContext {
  readonly captureId: string;
  attachFootage(fileUri: string): void;
}

export type HarnessRunSnapshot = Readonly<{
  phase: "idle" | "countdown" | "recording" | "finished";
  run: HarnessRun | null;
  currentMarker: string | null;
}>;

export interface HarnessRunEngineOptions {
  readonly buildCommit: string;
  readonly now: () => number;
  readonly recorder: HarnessRunRecorder;
  readonly sources?: Partial<Record<HarnessSignalSourceId, HarnessSignalSource>>;
}

export class HarnessRunEngine {
  private snapshot: HarnessRunSnapshot = {
    phase: "idle",
    run: null,
    currentMarker: null,
  };
  private definition: HarnessTestDefinition | undefined;
  private deadlineMs: number | undefined;
  private readonly listeners = new Set<() => void>();
  private readonly runningSources: HarnessSignalSource[] = [];
  private readonly preparedSources: HarnessSignalSource[] = [];
  private pendingFootage: HarnessRun["footage"];
  private readonly pendingSourceErrors: Array<
    Readonly<{ source: HarnessSignalSourceId; message: string }>
  > = [];
  private recordingTimer: ReturnType<typeof setTimeout> | undefined;

  public constructor(private readonly options: HarnessRunEngineOptions) {}

  public getSnapshot(): HarnessRunSnapshot {
    return this.snapshot;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public async start(definition: HarnessTestDefinition): Promise<void> {
    if (this.snapshot.phase !== "idle") {
      throw new Error("A harness run is already active");
    }
    this.definition = definition;
    this.snapshot = { phase: "countdown", run: null, currentMarker: null };
    this.notify();
    const captureId = `${definition.id}-${this.options.now()}`;
    for (const sourceId of definition.signalSources) {
      const source = this.options.sources?.[sourceId];
      if (source?.prepare === undefined) {
        continue;
      }
      try {
        await source.prepare({
          captureId,
          attachFootage: (fileUri) => {
            this.pendingFootage = { fileUri };
          },
        });
        this.preparedSources.push(source);
      } catch (error) {
        this.pendingSourceErrors.push({
          source: sourceId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, definition.countdownMs);
    });

    const startedAtMs = this.options.now();
    const run: HarnessRun = {
      version: 1,
      id: `${definition.id}-${startedAtMs}`,
      testId: definition.id,
      buildCommit: this.options.buildCommit,
      startedAtMs,
      ...(this.pendingFootage === undefined
        ? {}
        : { footage: this.pendingFootage }),
      events: [],
    };
    this.snapshot = { phase: "recording", run, currentMarker: null };
    this.notify();
    await this.options.recorder.save(run);
    this.pendingSourceErrors.splice(0).forEach(({ source, message }) => {
      this.appendEvent({
        type: "source-error",
        atMs: this.options.now(),
        source,
        message,
      });
    });
    const sourceIds = new Set([
      ...ALWAYS_ON_SIGNAL_SOURCES,
      ...definition.signalSources,
    ]);
    for (const sourceId of sourceIds) {
      const source = this.options.sources?.[sourceId];
      if (
        source === undefined ||
        (source.prepare !== undefined && !this.preparedSources.includes(source))
      ) {
        continue;
      }
      try {
        await source.start({
          record: (track, payload) => {
            this.appendEvent({
              type: "signal",
              atMs: this.options.now(),
              source: sourceId,
              track,
              payload,
            });
          },
        });
        this.runningSources.push(source);
      } catch (error) {
        this.appendEvent({
          type: "source-error",
          atMs: this.options.now(),
          source: sourceId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    this.deadlineMs = startedAtMs + definition.defaultDurationMs;
    this.scheduleTimeout();
  }

  public async pressMarker(label: string): Promise<void> {
    if (
      this.snapshot.phase !== "recording" ||
      !this.definition?.markerLabels.includes(label)
    ) {
      throw new Error(`Marker is not available for this run: ${label}`);
    }
    this.appendEvent({ type: "marker", atMs: this.options.now(), label });
    this.snapshot = { ...this.snapshot, currentMarker: label };
    this.notify();
    await this.persistCurrentRun();
  }

  public async recordAppState(
    state: "active" | "background" | "inactive",
  ): Promise<void> {
    if (this.snapshot.phase !== "recording") {
      return;
    }
    this.appendEvent({
      type: "app-state",
      atMs: this.options.now(),
      state,
    });
    await this.persistCurrentRun();
  }

  public async extend(durationMs: number): Promise<void> {
    if (this.snapshot.phase !== "recording" || durationMs <= 0) {
      throw new Error("A positive extension requires an active run");
    }
    this.deadlineMs = (this.deadlineMs ?? this.options.now()) + durationMs;
    this.appendEvent({
      type: "extension",
      atMs: this.options.now(),
      durationMs,
    });
    this.scheduleTimeout();
    await this.persistCurrentRun();
  }

  public async stop(): Promise<void> {
    await this.finish("stopped");
  }

  private async finish(endReason: HarnessRunEndReason): Promise<void> {
    const run = this.snapshot.run;
    if (this.snapshot.phase !== "recording" || run === null) {
      return;
    }
    const finished: HarnessRun = {
      ...run,
      endedAtMs: this.options.now(),
      endReason,
    };
    if (this.recordingTimer !== undefined) {
      clearTimeout(this.recordingTimer);
    }
    await Promise.all(
      [...new Set([
        ...this.runningSources.splice(0),
        ...this.preparedSources.splice(0),
      ])].map((source) =>
        source.stop().catch(() => undefined),
      ),
    );
    this.snapshot = {
      phase: "finished",
      run: finished,
      currentMarker: this.snapshot.currentMarker,
    };
    this.notify();
    this.recordingTimer = undefined;
    await this.options.recorder.save(finished);
  }

  private appendEvent(event: HarnessRunEvent): void {
    const run = this.snapshot.run;
    if (this.snapshot.phase !== "recording" || run === null) {
      return;
    }
    this.snapshot = {
      ...this.snapshot,
      run: { ...run, events: [...run.events, event] },
    };
    this.notify();
    void this.persistCurrentRun();
  }

  private async persistCurrentRun(): Promise<void> {
    if (this.snapshot.run !== null) {
      await this.options.recorder.save(this.snapshot.run);
    }
  }

  private scheduleTimeout(): void {
    if (this.recordingTimer !== undefined) {
      clearTimeout(this.recordingTimer);
    }
    const remainingMs = Math.max(
      0,
      (this.deadlineMs ?? this.options.now()) - this.options.now(),
    );
    this.recordingTimer = setTimeout(() => {
      void this.finish("timeout");
    }, remainingMs);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}
