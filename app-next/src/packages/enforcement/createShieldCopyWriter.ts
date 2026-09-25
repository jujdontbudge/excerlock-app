import type { ShieldCopyPort, ShieldCopySyncOutcome } from '../ports/ShieldCopyPort';
import {
  parseShieldCopyOverrides,
  serializeShieldCopyOverrides,
  type ShieldCopyOverridesJson,
} from './shieldCopyOverrides';

export interface ShieldCopyWriterDeps {
  readPayload(): Promise<unknown>;
  write(json: ShieldCopyOverridesJson): Promise<void>;
  isForeground(): boolean;
  reportError?(error: unknown): void;
}

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
