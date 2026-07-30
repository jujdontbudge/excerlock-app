import {
  CONDITION_CATALOG,
  type ConditionSource,
  type Signal,
} from "@excerlock/condition-model";
import type { JournalEntry } from "@excerlock/ledger";

import {
  getSignalFixture,
  isJsonValue,
  type SignalDomain,
  type Vendor,
} from "@/signals";

import type {
  ScenarioCondition,
  ScenarioConditionSource,
  ScenarioManifest,
  ScenarioTimelineRow,
  ScenarioVendorState,
} from "./scenarioTypes";

const SIGNAL_DOMAINS = [
  "health",
  "motion",
  "location",
  "screentime",
  "vendor",
] as const satisfies readonly SignalDomain[];
const VENDORS = [
  "strava",
  "oura",
  "whoop",
  "polar",
] as const satisfies readonly Vendor[];
const VENDOR_STATES = [
  "disconnected",
  "connecting",
  "connected",
  "error",
] as const satisfies readonly ScenarioVendorState[];
const CONDITION_SOURCES = [
  "health",
  "motion",
  "location",
  ...VENDORS,
] as const satisfies readonly ScenarioConditionSource[];
const SIGNALS = [...new Set(CONDITION_CATALOG.map(({ signal }) => signal))];

export function parseScenarioManifest(
  expectedName: string,
  input: unknown,
): ScenarioManifest {
  const manifest = record(input, "manifest");
  exactKeys(
    manifest,
    [
      "name",
      "version",
      "description",
      "clock",
      "state",
      "providers",
    ],
    ["timeline"],
    "manifest",
  );

  const name = nonEmptyString(manifest.name, "name");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
    invalid("name", "must be kebab-case");
  }
  if (name !== expectedName) {
    invalid("name", `must match filename "${expectedName}.json"`);
  }
  positiveInteger(manifest.version, "version");
  nonEmptyString(manifest.description, "description");
  parseClock(manifest.clock);
  parseState(manifest.state);
  parseProviders(manifest.providers);
  if (manifest.timeline !== undefined) {
    parseTimeline(manifest.timeline);
  }

  return manifest as unknown as ScenarioManifest;
}

function parseClock(input: unknown): void {
  const clock = record(input, "clock");
  const playback = clock.playback;
  if (playback === "manual") {
    exactKeys(clock, ["now", "playback"], [], "clock");
  } else if (playback === "auto") {
    exactKeys(clock, ["now", "playback", "speed"], [], "clock");
    positiveNumber(clock.speed, "clock.speed");
  } else {
    invalid("clock.playback", 'must be "manual" or "auto"');
  }

  const now = nonEmptyString(clock.now, "clock.now");
  if (
    !/(?:Z|[+-]\d{2}:\d{2})$/.test(now) ||
    !Number.isFinite(Date.parse(now))
  ) {
    invalid("clock.now", "must be an ISO-8601 instant with an explicit offset");
  }
}

function parseState(input: unknown): void {
  const state = record(input, "state");
  exactKeys(
    state,
    [
      "onboarding",
      "entitlement",
      "ledger",
      "conditions",
      "shield",
      "vendors",
    ],
    [],
    "state",
  );
  oneOf(state.onboarding, ["complete", "fresh"], "state.onboarding");
  oneOf(state.entitlement, ["free", "premium"], "state.entitlement");
  parseLedger(state.ledger);

  if (!Array.isArray(state.conditions)) {
    invalid("state.conditions", "must be an array");
  }
  state.conditions.forEach((condition, index) =>
    parseCondition(condition, `state.conditions[${index}]`),
  );

  const shield = record(state.shield, "state.shield");
  exactKeys(shield, ["armedMonitors"], [], "state.shield");
  const monitors = stringArray(
    shield.armedMonitors,
    "state.shield.armedMonitors",
  );
  if (new Set(monitors).size !== monitors.length) {
    invalid("state.shield.armedMonitors", "must not contain duplicates");
  }

  const vendors = record(state.vendors, "state.vendors");
  exactKeys(vendors, VENDORS, [], "state.vendors");
  VENDORS.forEach((vendor) =>
    oneOf(vendors[vendor], VENDOR_STATES, `state.vendors.${vendor}`),
  );
}

function parseLedger(input: unknown): void {
  const ledger = record(input, "state.ledger");
  exactKeys(
    ledger,
    ["baseAllowanceMinutes", "journal"],
    [],
    "state.ledger",
  );
  nonNegativeNumber(
    ledger.baseAllowanceMinutes,
    "state.ledger.baseAllowanceMinutes",
  );
  if (!Array.isArray(ledger.journal)) {
    invalid("state.ledger.journal", "must be an array");
  }
  ledger.journal.forEach((entry, index) =>
    parseJournalEntry(entry, `state.ledger.journal[${index}]`),
  );
}

function parseJournalEntry(input: unknown, path: string): void {
  const entry = record(input, path);
  const kind = entry.kind;
  const conditionEntry = kind === "earn" ||
    kind === "rateCredit" ||
    kind === "stateSustained";
  const kindKeys =
    kind === "earn"
      ? ["payout"]
      : kind === "rateCredit" || kind === "stateSustained" || kind === "drainTick"
        ? ["minutes"]
        : invalid(`${path}.kind`, "is unknown");
  exactKeys(
    entry,
    [
      "kind",
      "source",
      "id",
      "atMs",
      ...(conditionEntry ? ["conditionId"] : []),
      ...kindKeys,
    ],
    [],
    path,
  );
  nonEmptyString(entry.source, `${path}.source`);
  nonEmptyString(entry.id, `${path}.id`);
  finiteNumber(entry.atMs, `${path}.atMs`);
  if (conditionEntry) {
    nonEmptyString(entry.conditionId, `${path}.conditionId`);
  }
  if (kind === "earn") {
    parsePayout(entry.payout, `${path}.payout`);
  } else {
    positiveNumber(entry.minutes, `${path}.minutes`);
  }

  void (entry as unknown as JournalEntry);
}

function parsePayout(input: unknown, path: string): void {
  const payout = record(input, path);
  if (payout.type === "restOfDay") {
    exactKeys(payout, ["type"], [], path);
    return;
  }
  if (payout.type === "fixedChunk" || payout.type === "setPeriod") {
    exactKeys(payout, ["type", "minutes"], [], path);
    positiveNumber(payout.minutes, `${path}.minutes`);
    return;
  }
  invalid(`${path}.type`, "is unknown");
}

function parseCondition(input: unknown, path: string): void {
  const condition = record(input, path);
  const kind = condition.kind;
  const optionals = ["placeId"];
  if (kind === "event") {
    exactKeys(
      condition,
      ["kind", "signal", "source", "reward"],
      [...optionals, "threshold"],
      path,
    );
    if (condition.threshold !== undefined) {
      positiveNumber(condition.threshold, `${path}.threshold`);
    }
    parsePayout(condition.reward, `${path}.reward`);
  } else if (kind === "rate") {
    exactKeys(
      condition,
      ["kind", "signal", "source", "reward"],
      optionals,
      path,
    );
    const reward = record(condition.reward, `${path}.reward`);
    exactKeys(
      reward,
      ["type", "minutesPerUnit"],
      [],
      `${path}.reward`,
    );
    if (reward.type !== "proportionalCredit") {
      invalid(`${path}.reward.type`, 'must be "proportionalCredit"');
    }
    positiveNumber(
      reward.minutesPerUnit,
      `${path}.reward.minutesPerUnit`,
    );
  } else if (kind === "state") {
    exactKeys(
      condition,
      ["kind", "signal", "source", "reward", "exitGraceMs"],
      optionals,
      path,
    );
    const reward = record(condition.reward, `${path}.reward`);
    exactKeys(reward, ["type"], [], `${path}.reward`);
    if (reward.type !== "sustainedUnlock") {
      invalid(`${path}.reward.type`, 'must be "sustainedUnlock"');
    }
    nonNegativeNumber(condition.exitGraceMs, `${path}.exitGraceMs`);
  } else {
    invalid(`${path}.kind`, "is unknown");
  }

  const signal = oneOf(condition.signal, SIGNALS, `${path}.signal`);
  const source = oneOf(
    condition.source,
    CONDITION_SOURCES,
    `${path}.source`,
  );
  if (condition.placeId !== undefined) {
    nonEmptyString(condition.placeId, `${path}.placeId`);
  }
  assertCatalogCombination(kind, signal, source, path);

  void (condition as unknown as ScenarioCondition);
}

function assertCatalogCombination(
  kind: ScenarioCondition["kind"],
  signal: Signal,
  source: ScenarioConditionSource,
  path: string,
): void {
  const appSource = source === "health" ? "appleHealth" : source;
  const matches = CONDITION_CATALOG.some(
    (entry) =>
      entry.kind === kind &&
      entry.signal === signal &&
      (entry.baseSources as readonly ConditionSource[]).includes(appSource),
  );
  if (!matches) {
    invalid(
      path,
      `has no catalog entry for ${kind}/${signal}/${source}`,
    );
  }
}

function parseProviders(input: unknown): void {
  const providers = record(input, "providers");
  exactKeys(providers, SIGNAL_DOMAINS, [], "providers");
  SIGNAL_DOMAINS.forEach((domain) => {
    const selection = record(providers[domain], `providers.${domain}`);
    exactKeys(selection, ["fixture"], [], `providers.${domain}`);
    const fixture = nonEmptyString(
      selection.fixture,
      `providers.${domain}.fixture`,
    );
    getSignalFixture(domain, fixture);
  });
}

function parseTimeline(input: unknown): readonly ScenarioTimelineRow[] {
  if (!Array.isArray(input)) {
    invalid("timeline", "must be an array");
  }
  let previousAtMs = Number.NEGATIVE_INFINITY;
  return input.map((candidate, index) => {
    const path = `timeline[${index}]`;
    const row = record(candidate, path);
    exactKeys(row, ["atMs", "event", "payload"], [], path);
    const atMs = finiteNumber(row.atMs, `${path}.atMs`);
    if (atMs < previousAtMs) {
      invalid("timeline", "rows must be sorted by atMs");
    }
    previousAtMs = atMs;
    const event = nonEmptyString(row.event, `${path}.event`);
    const domain = event.split(".", 1)[0];
    if (!SIGNAL_DOMAINS.includes(domain as SignalDomain)) {
      invalid(`${path}.event`, `has unknown provider prefix "${domain}"`);
    }
    if (!isJsonValue(row.payload)) {
      invalid(`${path}.payload`, "must contain only JSON values");
    }
    return { atMs, event, payload: row.payload };
  });
}

function exactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[],
  path: string,
): void {
  const keys = Object.keys(value);
  const allowed = new Set([...required, ...optional]);
  const missing = required.filter((key) => !keys.includes(key));
  const unknown = keys.filter((key) => !allowed.has(key));
  if (missing.length > 0 || unknown.length > 0) {
    invalid(
      path,
      [
        missing.length === 0 ? "" : `missing ${missing.join(", ")}`,
        unknown.length === 0 ? "" : `unknown ${unknown.join(", ")}`,
      ]
        .filter(Boolean)
        .join("; "),
    );
  }
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    invalid(path, "must be an object");
  }
  return value as Record<string, unknown>;
}

function nonEmptyString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    invalid(path, "must be a non-empty string");
  }
  return value;
}

function stringArray(value: unknown, path: string): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || item.trim().length === 0)
  ) {
    invalid(path, "must be an array of non-empty strings");
  }
  return value as string[];
}

function positiveInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    invalid(path, "must be a positive integer");
  }
  return value;
}

function finiteNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    invalid(path, "must be a finite number");
  }
  return value;
}

function nonNegativeNumber(value: unknown, path: string): number {
  const number = finiteNumber(value, path);
  if (number < 0) {
    invalid(path, "must not be negative");
  }
  return number;
}

function positiveNumber(value: unknown, path: string): number {
  const number = finiteNumber(value, path);
  if (number <= 0) {
    invalid(path, "must be positive");
  }
  return number;
}

function oneOf<const Value extends string>(
  value: unknown,
  allowed: readonly Value[],
  path: string,
): Value {
  if (
    typeof value !== "string" ||
    !allowed.includes(value as Value)
  ) {
    invalid(path, `must be one of ${allowed.join(", ")}`);
  }
  return value as Value;
}

function invalid(path: string, message: string): never {
  throw new Error(`Invalid E2E scenario manifest: ${path} ${message}`);
}
