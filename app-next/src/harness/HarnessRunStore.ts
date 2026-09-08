import type { DiagnosticsStorage } from "../diagnostics/DiagnosticsLog";
import type { HarnessRun, HarnessRunEvent } from "./HarnessRunEngine";
import type { HarnessFootageCapture } from "./HarnessCameraSource";

export const HARNESS_RUN_INDEX_KEY = "excerlock.harness.runs.v1.index";
export const HARNESS_RUN_KEY_PREFIX = "excerlock.harness.runs.v1.run.";

export class HarnessRunStore {
  public constructor(
    private readonly storage: DiagnosticsStorage,
    private readonly footage?: Pick<HarnessFootageCapture, "deleteAll">,
  ) {}

  public async save(run: HarnessRun): Promise<void> {
    await this.storage.setItem(
      `${HARNESS_RUN_KEY_PREFIX}${run.id}`,
      JSON.stringify(run),
    );
    const identifiers = await this.readIndex();
    if (!identifiers.includes(run.id)) {
      await this.storage.setItem(
        HARNESS_RUN_INDEX_KEY,
        JSON.stringify([...identifiers, run.id]),
      );
    }
  }

  public async get(id: string): Promise<HarnessRun | null> {
    return parseRun(
      await this.storage.getItem(`${HARNESS_RUN_KEY_PREFIX}${id}`),
    );
  }

  public async list(): Promise<readonly HarnessRun[]> {
    const runs = await Promise.all(
      (await this.readIndex()).map((id) => this.get(id)),
    );
    return runs.filter((run): run is HarnessRun => run !== null);
  }

  public async deleteAllFootage(): Promise<void> {
    await this.footage?.deleteAll();
    const runs = await this.list();
    await Promise.all(
      runs
        .filter((run) => run.footage !== undefined)
        .map(({ footage: _footage, ...run }) => this.save(run)),
    );
  }

  private async readIndex(): Promise<readonly string[]> {
    const raw = await this.storage.getItem(HARNESS_RUN_INDEX_KEY);
    if (raw === null) {
      return [];
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === "string")
        : [];
    } catch {
      return [];
    }
  }
}

type RunHeader = Omit<HarnessRun, "events">;

type ExportRecord =
  | Readonly<{ recordType: "run"; run: RunHeader }>
  | Readonly<{
      recordType: "event";
      runId: string;
      event: HarnessRunEvent;
    }>;

export function serializeHarnessJsonLines(
  runs: readonly HarnessRun[],
): string {
  return runs
    .flatMap((run): ExportRecord[] => {
      const { events, footage: _footage, ...header } = run;
      return [
        { recordType: "run", run: header },
        ...events.map((event) => ({
          recordType: "event" as const,
          runId: run.id,
          event,
        })),
      ];
    })
    .map((record) => JSON.stringify(record))
    .join("\n");
}

export function parseHarnessJsonLines(contents: string): HarnessRun[] {
  const runs = new Map<string, HarnessRun>();
  for (const line of contents.split(/\r?\n/).filter(Boolean)) {
    const record: unknown = JSON.parse(line);
    if (isRunRecord(record)) {
      runs.set(record.run.id, { ...record.run, events: [] });
      continue;
    }
    if (isEventRecord(record)) {
      const run = runs.get(record.runId);
      if (run !== undefined) {
        runs.set(record.runId, {
          ...run,
          events: [...run.events, record.event],
        });
      }
    }
  }
  return [...runs.values()];
}

function parseRun(raw: string | null): HarnessRun | null {
  if (raw === null) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(raw);
    return isRun(value) ? value : null;
  } catch {
    return null;
  }
}

function isRun(value: unknown): value is HarnessRun {
  return (
    typeof value === "object" &&
    value !== null &&
    Reflect.get(value, "version") === 1 &&
    typeof Reflect.get(value, "id") === "string" &&
    typeof Reflect.get(value, "testId") === "string" &&
    typeof Reflect.get(value, "buildCommit") === "string" &&
    typeof Reflect.get(value, "startedAtMs") === "number" &&
    Array.isArray(Reflect.get(value, "events"))
  );
}

function isRunRecord(value: unknown): value is Extract<
  ExportRecord,
  { recordType: "run" }
> {
  if (
    typeof value !== "object" ||
    value === null ||
    Reflect.get(value, "recordType") !== "run"
  ) {
    return false;
  }
  const run = Reflect.get(value, "run");
  return isRun({ ...(typeof run === "object" && run !== null ? run : {}), events: [] });
}

function isEventRecord(value: unknown): value is Extract<
  ExportRecord,
  { recordType: "event" }
> {
  return (
    typeof value === "object" &&
    value !== null &&
    Reflect.get(value, "recordType") === "event" &&
    typeof Reflect.get(value, "runId") === "string" &&
    typeof Reflect.get(value, "event") === "object" &&
    Reflect.get(value, "event") !== null
  );
}
