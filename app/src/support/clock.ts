export interface SupportClock {
  nowMs(): number;
}

export class SystemSupportClock implements SupportClock {
  public nowMs(): number {
    return Date.now();
  }
}

export class ManualSupportClock implements SupportClock {
  public constructor(private currentMs: number) {}

  public nowMs(): number {
    return this.currentMs;
  }
}
