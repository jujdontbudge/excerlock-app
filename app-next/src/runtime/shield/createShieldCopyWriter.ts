import type { ShieldCopyPort, ShieldCopySyncOutcome } from '../../ports/ShieldCopyPort';
import {
  parseShieldCopyOverrides,
  serializeShieldCopyOverrides,
  type ShieldCopyOverridesJson,
} from './shieldCopyOverrides';

export interface ShieldCopyWriterDeps {
  /** Reads the PostHog `shield_copy` payload after flags settle for the committed identity. */
  readPayload(): Promise<unknown>;
  /** Writes the canonical JSON to the App Group through the native module. */
  write(json: ShieldCopyOverridesJson): Promise<void>;
  isForeground(): boolean;
  reportError?(error: unknown): void;
}

/**
 * Applies the remote shield copy on foreground once flags settle.
 *
 * A malformed payload writes nothing and clears nothing, so the last valid
 * override stays applied until an operator publishes a valid one.
 */
export function createShieldCopyWriter(deps: ShieldCopyWriterDeps): ShieldCopyPort {
  let lastWritten: string | null = null;
  let inFlight: Promise<ShieldCopySyncOutcome> | null = null;
  const run = async (): Promise<ShieldCopySyncOutcome> => {
    const payload = await deps.readPayload();
    if (payload === undefined) return 'no-payload';
    const overrides = parseShieldCopyOverrides(payload);
    if (!overrides) return 'malformed';
    const json = serializeShieldCopyOverrides(overrides);
    if (json === lastWritten) return 'unchanged';
    // A payload that settled while the app went to the background waits for the
    // next foreground instead of writing unseen.
    if (!deps.isForeground()) return 'skipped';
    await deps.write(json);
    lastWritten = json;
    return 'written';
  };
  return {
    sync() {
      if (!deps.isForeground()) return Promise.resolve('skipped');
      if (inFlight) return inFlight;
      inFlight = run()
        .catch((error) => {
          deps.reportError?.(error);
          return 'skipped' as const;
        })
        .finally(() => {
          inFlight = null;
        });
      return inFlight;
    },
  };
}
