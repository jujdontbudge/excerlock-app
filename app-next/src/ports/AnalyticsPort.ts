export interface AnalyticsPort {
  track(event: string, props?: Record<string, unknown>): void;
  screen(name: string): void;
  identify(id: string): void;
  /** `$set` on the current person — the four onboarding answers, never an event payload. */
  setPersonProperties(props: Record<string, unknown>): void;
  reset(): void;
}
