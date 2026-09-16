export type ShieldCopySyncOutcome = 'written' | 'unchanged' | 'no-payload' | 'malformed' | 'skipped';

/** Remote shield copy rail: applies the `shield_copy` flag payload on foreground. */
export interface ShieldCopyPort {
  sync(): Promise<ShieldCopySyncOutcome>;
}
