import type {
  FixtureManifest,
  JsonValue,
  TimelinePlayback,
  TimelinePlayerOptions,
  TimelineRow,
} from "./types";
import { validateManifest } from "./validation";

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
    validateManifest(
      this.manifest,
      new Set(options.allowedEvents),
      options.validateRow,
    );
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
