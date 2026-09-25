import { ClockPort } from '../../ports/ClockPort';
export class FakeClock implements ClockPort {
  private instant: number;
  private zone: string;
  private listeners = new Set<() => void>();
  private observers = new Set<() => void>();
  private timer: ReturnType<typeof setInterval> | undefined;
  constructor(now: string, timezone: string) {
    this.instant = Date.parse(now);
    this.zone = timezone;
  }
  now = () => new Date(this.instant).toISOString();
  timezone = () => this.zone;
  advance = (ms: number) => {
    this.instant += ms;
    this.emit();
  };
  set = (now: string, timezone = this.zone) => {
    if (!Number.isFinite(Date.parse(now))) throw new Error('Invalid clock instant');
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    this.instant = Date.parse(now);
    this.zone = timezone;
    this.emit();
  };
  private emit = () => {
    this.listeners.forEach((callback) => callback());
    this.observers.forEach((callback) => callback());
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
  };
}
