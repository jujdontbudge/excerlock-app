export type CancelScheduledNotificationTask = () => void;

export interface NotificationClock {
  nowMs(): number;
  scheduleAt(
    atMs: number,
    callback: () => void,
  ): CancelScheduledNotificationTask;
}

export class SystemNotificationClock implements NotificationClock {
  public nowMs(): number {
    return new Date().getTime();
  }

  public scheduleAt(
    atMs: number,
    callback: () => void,
  ): CancelScheduledNotificationTask {
    const timer = setTimeout(callback, Math.max(0, atMs - this.nowMs()));
    return () => clearTimeout(timer);
  }
}

type ManualClockTask = {
  readonly id: number;
  readonly atMs: number;
  readonly callback: () => void;
};

/** Deterministic driver for the mock adapter's tests; not exported by index.ts. */
export class ManualNotificationClock implements NotificationClock {
  private currentTimeMs: number;
  private nextTaskId = 1;
  private readonly tasks = new Map<number, ManualClockTask>();

  public constructor(initialTimeMs: number) {
    if (!Number.isFinite(initialTimeMs)) {
      throw new Error("Notification clock must start at a finite time");
    }
    this.currentTimeMs = initialTimeMs;
  }

  public nowMs(): number {
    return this.currentTimeMs;
  }

  public scheduleAt(
    atMs: number,
    callback: () => void,
  ): CancelScheduledNotificationTask {
    const task: ManualClockTask = {
      id: this.nextTaskId,
      atMs,
      callback,
    };
    this.nextTaskId += 1;
    this.tasks.set(task.id, task);
    return () => this.tasks.delete(task.id);
  }

  public advanceTo(atMs: number): void {
    if (!Number.isFinite(atMs) || atMs < this.currentTimeMs) {
      throw new Error("Notification clock cannot move backward");
    }

    while (true) {
      const next = [...this.tasks.values()]
        .filter((task) => task.atMs <= atMs)
        .sort((left, right) => left.atMs - right.atMs || left.id - right.id)[0];
      if (!next) {
        break;
      }

      this.tasks.delete(next.id);
      this.currentTimeMs = Math.max(this.currentTimeMs, next.atMs);
      next.callback();
    }

    this.currentTimeMs = atMs;
  }
}
