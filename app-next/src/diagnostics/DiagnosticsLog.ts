/**
 * An append-only event log that survives the process it is observing.
 *
 * Device testing happens away from the Mac: no Metro, often no Wi-Fi, and the
 * app is deliberately backgrounded, force-quit, and rebooted. `console.log` is
 * invisible under those conditions, so anything worth knowing has to be written
 * somewhere the next launch can read it back.
 */

export type DiagnosticsEntry = Readonly<{
  atMs: number;
  event: string;
  data: Readonly<Record<string, unknown>>;
}>;

export interface DiagnosticsStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const DIAGNOSTICS_STORAGE_KEY = "excerlock.diagnostics.v1";

const DEFAULT_MAX_ENTRIES = 5_000;

export interface DiagnosticsLogOptions {
  readonly storage: DiagnosticsStorage;
  readonly now: () => number;
  readonly maxEntries?: number;
}

export class DiagnosticsLog {
  private readonly storage: DiagnosticsStorage;
  private readonly now: () => number;
  private readonly maxEntries: number;
  private buffer: DiagnosticsEntry[] = [];
  private readonly listeners = new Set<() => void>();
  private dirty = false;

  public constructor(options: DiagnosticsLogOptions) {
    this.storage = options.storage;
    this.now = options.now;
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  }

  /** Synchronous by design: recording must never await inside a sensor callback. */
  public append(event: string, data: Record<string, unknown> = {}): void {
    this.buffer.push(Object.freeze({ atMs: this.now(), event, data }));
    if (this.buffer.length > this.maxEntries) {
      this.buffer.splice(0, this.buffer.length - this.maxEntries);
    }
    this.dirty = true;
    this.notify();
  }

  public entries(): readonly DiagnosticsEntry[] {
    return this.buffer;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Recovers what a previous run persisted, keeping anything already buffered. */
  public async hydrate(): Promise<void> {
    let recovered: DiagnosticsEntry[] = [];
    try {
      recovered = parseEntries(
        await this.storage.getItem(DIAGNOSTICS_STORAGE_KEY),
      );
    } catch {
      // A diagnostics log that breaks the app it observes is worse than none.
      return;
    }
    if (recovered.length === 0) {
      return;
    }
    this.buffer = [...recovered, ...this.buffer].slice(-this.maxEntries);
    this.notify();
  }

  public async flush(): Promise<void> {
    if (!this.dirty) {
      return;
    }
    this.dirty = false;
    try {
      await this.storage.setItem(
        DIAGNOSTICS_STORAGE_KEY,
        JSON.stringify(this.buffer),
      );
    } catch {
      // Same reasoning as hydrate: never surface storage failure to the app.
    }
  }

  public async clear(): Promise<void> {
    this.buffer = [];
    this.dirty = false;
    this.notify();
    try {
      await this.storage.removeItem(DIAGNOSTICS_STORAGE_KEY);
    } catch {
      // Ignored for the same reason.
    }
  }

  /** Tab-separated so it survives being pasted anywhere. */
  public toText(): string {
    return this.buffer
      .map(({ atMs, event, data }) =>
        [atMs, event, JSON.stringify(data)].join("\t"),
      )
      .join("\n");
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

function parseEntries(raw: string | null): DiagnosticsEntry[] {
  if (raw === null) {
    return [];
  }
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.filter(isEntry);
}

function isEntry(value: unknown): value is DiagnosticsEntry {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const atMs = Reflect.get(value, "atMs");
  const event = Reflect.get(value, "event");
  const data = Reflect.get(value, "data");
  return (
    typeof atMs === "number" &&
    typeof event === "string" &&
    typeof data === "object" &&
    data !== null
  );
}
