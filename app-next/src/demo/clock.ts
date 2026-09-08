import { ClockPort } from '../ports/ClockPort';
export class FakeClock implements ClockPort {
  private instant: number;
  private monotonic = 0;
  private zone: string;
  private listeners = new Set<() => void>();
  private observers = new Set<() => void>();
  private deadlines = new Map<() => void, number>();
  private timer: ReturnType<typeof setInterval> | undefined;
  constructor(now: string, timezone: string) {
    this.instant = Date.parse(now);
    this.zone = timezone;
  }
  now = () => new Date(this.instant).toISOString();
  timezone = () => this.zone;
  monotonicMs = () => this.monotonic;
  advance = (ms: number) => {
    this.instant += ms;
    this.monotonic += Math.max(0, ms);
    this.emit();
  };
  set = (now: string, timezone = this.zone) => {
    if (!Number.isFinite(Date.parse(now))) throw new Error('Invalid clock instant');
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    const next = Date.parse(now);
    this.monotonic += Math.max(0, next - this.instant);
    this.instant = next;
    this.zone = timezone;
    this.emit();
  };
  private emit = () => {
    for (const [callback, deadline] of this.deadlines) {
      if (deadline <= this.instant) {
        this.deadlines.delete(callback);
        callback();
      }
    }
    this.listeners.forEach((callback) => callback());
    this.observers.forEach((callback) => callback());
  };
  at = (deadline: string, callback: () => void) => {
    const instant = Date.parse(deadline);
    if (!Number.isFinite(instant)) throw new Error('INVALID_CLOCK_DEADLINE');
    if (instant <= this.instant) callback();
    else this.deadlines.set(callback, instant);
    return () => {
      this.deadlines.delete(callback);
    };
  };
  observe = (callback: () => void) => {
    this.observers.add(callback);
    return () => {
      this.observers.delete(callback);
    };
  };
  subscribe = (callback: () => void) => {
    this.listeners.add(callback);
    if (!this.timer) this.timer = setInterval(() => this.advance(1000), 1000);
    return () => {
      this.listeners.delete(callback);
      if (!this.listeners.size) {
        clearInterval(this.timer);
        this.timer = undefined;
      }
    };
  };
  dispose = () => {
    clearInterval(this.timer);
    this.timer = undefined;
    this.listeners.clear();
    this.observers.clear();
    this.deadlines.clear();
  };
}
