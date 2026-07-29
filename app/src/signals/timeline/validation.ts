import type {
  FixtureManifest,
  JsonValue,
  TimelineRow,
} from "./types";

export function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  if (typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return false;
  }
  return Object.values(value).every(isJsonValue);
}

export function assertExactPayloadKeys(
  payload: unknown,
  expectedKeys: readonly string[],
  event: string,
): void {
  if (payload === null || Array.isArray(payload) || typeof payload !== "object") {
    throw new Error(`Invalid payload for ${event}; expected an object`);
  }
  const actual = Object.keys(payload).sort();
  const expected = [...expectedKeys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new Error(
      `Invalid payload fields for ${event}; expected ${expected.join(", ") || "none"}`,
    );
  }
}

export function validateManifest<EventName extends string, Payload>(
  manifest: FixtureManifest<EventName, Payload>,
  allowedEvents: ReadonlySet<EventName>,
  validateRow?: (row: TimelineRow<EventName, Payload>) => void,
): void {
  if (
    typeof manifest.name !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.name)
  ) {
    throw new Error(`Invalid fixture name "${manifest.name}"; expected kebab-case`);
  }
  if (!Number.isInteger(manifest.version) || manifest.version < 1) {
    throw new Error(`Invalid fixture version for "${manifest.name}"`);
  }
  if (
    typeof manifest.description !== "string" ||
    manifest.description.trim().length === 0
  ) {
    throw new Error(`Invalid fixture description for "${manifest.name}"`);
  }
  if (!Array.isArray(manifest.timeline)) {
    throw new Error(`Invalid fixture timeline for "${manifest.name}"`);
  }

  let previousAtMs = Number.NEGATIVE_INFINITY;
  manifest.timeline.forEach((row, index) => {
    if (!Number.isFinite(row.atMs)) {
      throw new Error(`Invalid atMs at timeline row ${index} in "${manifest.name}"`);
    }
    if (row.atMs < previousAtMs) {
      throw new Error(`Timeline rows must be sorted by atMs in "${manifest.name}"`);
    }
    if (!allowedEvents.has(row.event)) {
      throw new Error(`Unknown fixture event "${row.event}" in "${manifest.name}"`);
    }
    if (!isJsonValue(row.payload)) {
      throw new Error(
        `Fixture payload must contain JSON values at row ${index} in "${manifest.name}"`,
      );
    }
    validateRow?.(row);
    previousAtMs = row.atMs;
  });
}
