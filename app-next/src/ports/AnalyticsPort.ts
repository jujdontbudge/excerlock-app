import type { ClientEventName } from '@excerlock/analytics-events';

export interface AnalyticsPort {
  /**
   * Only registry-declared, client-owned event names compile; the name is a
   * static literal (D3) and the transport-boundary allowlist drops anything
   * else at runtime.
   */
  track(event: ClientEventName, props?: Record<string, unknown>): void;
  screen(name: string): void;
  identify(id: string): Promise<void>;
  reset(): Promise<void>;
  setEnabled?(enabled: boolean): Promise<void>;
}
