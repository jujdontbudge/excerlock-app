export interface AnalyticsPort {
  track(event: string, props?: Record<string, unknown>): void;
  screen(name: string): void;
  identify(id: string): Promise<void>;
  reset(): Promise<void>;
}
