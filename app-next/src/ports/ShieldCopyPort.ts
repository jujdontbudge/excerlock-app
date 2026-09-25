export type ShieldCopySyncOutcome = 'written' | 'unchanged' | 'no-payload' | 'malformed' | 'skipped';

export interface ShieldCopyPort {
  sync(): Promise<ShieldCopySyncOutcome>;
}
