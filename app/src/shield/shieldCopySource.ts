import type { ShieldCopySource } from "./ShieldContentCoordinator";
import type {
  ShieldCause,
  ShieldCopyOverride,
  ShieldCopyOverrides,
} from "./ShieldContentPublisher";

const CAUSES: readonly ShieldCause[] = [
  "balanceEmpty",
  "fullLock",
  "walkAndScrollEnded",
  "lockWindow",
];
const EMPTY_OVERRIDES: ShieldCopyOverrides = Object.freeze({});

let installedOverrides = EMPTY_OVERRIDES;

/**
 * #87 integration point: pass the `exp-shield-copy` payload here when the
 * provider accepts its control-first timing window. No random choice happens
 * on-device; this module only validates and holds the variant PostHog chose.
 */
export function installShieldCopyOverrides(payload: unknown): void {
  installedOverrides = parseOverrides(payload);
}

export const shieldCopySource: ShieldCopySource = Object.freeze({
  current: () => installedOverrides,
});

function parseOverrides(payload: unknown): ShieldCopyOverrides {
  if (!isRecord(payload)) {
    return EMPTY_OVERRIDES;
  }

  const overrides: Partial<Record<ShieldCause, ShieldCopyOverride>> = {};
  for (const cause of CAUSES) {
    const parsed = parseOverride(payload[cause]);
    if (parsed !== undefined) {
      overrides[cause] = Object.freeze(parsed);
    }
  }
  return Object.keys(overrides).length === 0
    ? EMPTY_OVERRIDES
    : Object.freeze(overrides);
}

function parseOverride(value: unknown): ShieldCopyOverride | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const title = nonEmptyString(value.title);
  const subtitle = nonEmptyString(value.subtitle);
  if (title === undefined && subtitle === undefined) {
    return undefined;
  }
  return {
    ...(title === undefined ? {} : { title }),
    ...(subtitle === undefined ? {} : { subtitle }),
  };
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
