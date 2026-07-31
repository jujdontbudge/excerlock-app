export const SHIELD_COPY_CAUSES = [
  "balanceEmpty",
  "fullLock",
  "walkAndScrollEnded",
  "lockWindow",
] as const;

export type ShieldCopyCause = (typeof SHIELD_COPY_CAUSES)[number];

export interface ShieldCopy {
  title: string;
  subtitle: string;
}

export type ShieldCopyPayload = Readonly<Record<ShieldCopyCause, ShieldCopy>>;

const COPY_FIELDS = ["title", "subtitle"] as const;
const MAX_COPY_LENGTH = 180;

function exactKeys(value: object, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === expected.length &&
    [...expected].sort().every((key, index) => actual[index] === key);
}

function isCopy(value: unknown): value is ShieldCopy {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  if (!exactKeys(value, COPY_FIELDS)) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return COPY_FIELDS.every((field) => {
    const text = candidate[field];
    return typeof text === "string" &&
      text.length > 0 &&
      text.length <= MAX_COPY_LENGTH &&
      text.trim() === text;
  });
}

export function decodeShieldCopyPayload(value: unknown): ShieldCopyPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  if (!exactKeys(value, SHIELD_COPY_CAUSES)) {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  if (!SHIELD_COPY_CAUSES.every((cause) => isCopy(candidate[cause]))) {
    return null;
  }
  return Object.fromEntries(
    SHIELD_COPY_CAUSES.map((cause) => [cause, candidate[cause]]),
  ) as ShieldCopyPayload;
}
