export type JsonPrimitive = boolean | number | string | null;
export type JsonValue =
  | JsonPrimitive
  | { readonly [key: string]: JsonValue }
  | readonly JsonValue[];

export interface TimelineRow<EventName extends string, Payload = JsonValue> {
  readonly atMs: number;
  readonly event: EventName;
  readonly payload: Payload;
}

export interface FixtureManifest<
  EventName extends string,
  Payload = JsonValue,
> {
  readonly name: string;
  readonly version: number;
  readonly description: string;
  readonly timeline: readonly TimelineRow<EventName, Payload>[];
}

export interface ManualPlayback {
  readonly mode: "manual";
}

export interface AutoPlayback {
  readonly mode: "auto";
  readonly speed: number;
}

export type TimelinePlayback = AutoPlayback | ManualPlayback;

export interface TimelinePlayerOptions<
  EventName extends string,
  Payload,
> {
  readonly manifest: FixtureManifest<EventName, Payload>;
  readonly allowedEvents: readonly EventName[];
  readonly playback: TimelinePlayback;
  readonly onEvent: (row: TimelineRow<EventName, Payload>) => void;
}

export function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  if (typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return false;
  }
  return Object.values(value).every(isJsonValue);
}

function validateManifest<EventName extends string, Payload>(
  manifest: FixtureManifest<EventName, Payload>,
  allowedEvents: ReadonlySet<EventName>,
): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.name)) {
    throw new Error(`Invalid fixture name "${manifest.name}"; expected kebab-case`);
  }
  if (!Number.isInteger(manifest.version) || manifest.version < 1) {
    throw new Error(`Invalid fixture version for "${manifest.name}"`);
  }

  let previousAtMs = Number.NEGATIVE_INFINITY;
  manifest.timeline.forEach((row, index) => {
    if (!Number.isFinite(row.atMs)) {
      throw new Error(`Invalid atMs at timeline row ${index} in "${manifest.name}"`);
    }
    if (row.atMs < previousAtMs) {
      throw new Error(`Timeline rows must be sorted by atMs in "${manifest.name}"`);
    }
    if (!allowedEvents.has(row.event)) {
      throw new Error(`Unknown fixture event "${row.event}" in "${manifest.name}"`);
    }
    if (!isJsonValue(row.payload)) {
      throw new Error(
        `Fixture payload must contain JSON values at row ${index} in "${manifest.name}"`,
      );
    }
    previousAtMs = row.atMs;
  });
}

export class TimelinePlayer<
  EventName extends string,
  Payload = JsonValue,
> {
  private nextRowIndex = 0;
  private readonly manifest: FixtureManifest<EventName, Payload>;
  private readonly onEvent: (row: TimelineRow<EventName, Payload>) => void;
  private readonly playback: TimelinePlayback;
  private timer: ReturnType<typeof setTimeout> | undefined;

  public currentTimeMs = 0;

  public constructor(options: TimelinePlayerOptions<EventName, Payload>) {
    this.manifest = options.manifest;
    this.onEvent = options.onEvent;
    this.playback = options.playback;
    if (
      this.playback.mode === "auto" &&
      (!Number.isFinite(this.playback.speed) || this.playback.speed <= 0)
    ) {
      throw new Error("Auto playback speed must be a positive finite number");
    }
    validateManifest(this.manifest, new Set(options.allowedEvents));
    this.applyRowsThrough(0);
    this.scheduleNextRow();
  }

  public advanceBy(milliseconds: number): void {
    if (!Number.isFinite(milliseconds) || milliseconds < 0) {
      throw new Error("Timeline advance must be a non-negative finite number");
    }
    this.advanceTo(this.currentTimeMs + milliseconds);
  }

  public advanceTo(atMs: number): void {
    if (!Number.isFinite(atMs)) {
      throw new Error("Timeline clock must be a finite number");
    }
    if (atMs < this.currentTimeMs) {
      throw new Error("Timeline clock cannot move backward");
    }

    this.clearTimer();
    this.applyRowsThrough(atMs);
    this.currentTimeMs = atMs;
    this.scheduleNextRow();
  }

  public dispose(): void {
    this.clearTimer();
  }

  private applyRowsThrough(atMs: number): void {
    while (
      this.nextRowIndex < this.manifest.timeline.length &&
      this.manifest.timeline[this.nextRowIndex].atMs <= atMs
    ) {
      const row = this.manifest.timeline[this.nextRowIndex];
      this.nextRowIndex += 1;
      this.onEvent(row);
    }
  }

  private scheduleNextRow(): void {
    if (
      this.playback.mode !== "auto" ||
      this.nextRowIndex >= this.manifest.timeline.length
    ) {
      return;
    }

    const nextAtMs = this.manifest.timeline[this.nextRowIndex].atMs;
    const realDelayMs = (nextAtMs - this.currentTimeMs) / this.playback.speed;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.advanceTo(nextAtMs);
    }, realDelayMs);
  }

  private clearTimer(): void {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }
}
