import type { ClientEventName } from '@excerlock/analytics-events';

export interface AnalyticsPort {
  track(event: ClientEventName, props?: Record<string, unknown>): void;
  screen(name: string): void;
  identify(id: string): Promise<void>;
  reset(): Promise<void>;
  setEnabled?(enabled: boolean): Promise<void>;
}
