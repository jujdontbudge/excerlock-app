import {
  createFixtureProviderComposition,
  type FixtureProviderComposition,
} from "./fixtureProviderComposition";
import {
  loadScenarioState,
  type LoadedScenarioState,
} from "./loadScenarioState";
import { parseScenarioManifest } from "./parseScenarioManifest";
import { getScenarioManifest } from "./scenarioCatalog";
import { matchScenarioDeepLink } from "./scenarioUrl";
import type { ScenarioManifest } from "./scenarioTypes";

export type LoadedScenario = Readonly<{
  manifest: ScenarioManifest;
  state: LoadedScenarioState;
  composition: FixtureProviderComposition;
}>;

export async function loadScenarioDeepLink(
  url: string,
): Promise<LoadedScenario | null> {
  const selection = parseScenarioSelection(url);
  if (selection === null) {
    return null;
  }

  const bundled = getScenarioManifest(selection.name);
  const manifest = parseScenarioManifest(
    selection.name,
    selection.overrides === undefined
      ? bundled
      : applyMergePatch(bundled, selection.overrides),
  );
  const state = await loadScenarioState(manifest);
  const composition = createFixtureProviderComposition(manifest);

  return Object.freeze({ manifest, state, composition });
}

type ScenarioSelection = Readonly<{
  name: string;
  overrides?: unknown;
}>;

function parseScenarioSelection(
  url: string,
): ScenarioSelection | null {
  const selected = matchScenarioDeepLink(url);
  if (selected === null) {
    return null;
  }

  const [pathAndQuery] = selected.split("#", 1);
  const [encodedName, query = ""] = pathAndQuery?.split("?", 2) ?? [];
  if (
    encodedName === undefined ||
    encodedName.length === 0 ||
    encodedName.includes("/")
  ) {
    throw new Error(`Invalid E2E scenario deep link "${url}"`);
  }
  const name = decodeURIComponent(encodedName);
  const overrideValues = query
    .split("&")
    .filter(Boolean)
    .flatMap((pair) => {
      const [key, value = ""] = pair.split("=", 2);
      return decodeQueryValue(key) === "overrides"
        ? [decodeQueryValue(value)]
        : [];
    });
  if (overrideValues.length > 1) {
    throw new Error(
      `Invalid E2E scenario "${name}" overrides: expected one JSON object`,
    );
  }
  const encodedOverrides = overrideValues[0];
  if (encodedOverrides === undefined) {
    return { name };
  }

  try {
    return { name, overrides: JSON.parse(encodedOverrides) };
  } catch (error) {
    throw new Error(
      `Invalid E2E scenario "${name}" overrides: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function decodeQueryValue(value: string): string {
  return decodeURIComponent(value.replace(/\+/g, " "));
}

function applyMergePatch(target: unknown, patch: unknown): unknown {
  if (!isRecord(patch)) {
    return patch;
  }

  const result: Record<string, unknown> = isRecord(target)
    ? { ...target }
    : {};
  Object.entries(patch).forEach(([key, value]) => {
    if (value === null) {
      delete result[key];
    } else {
      result[key] = applyMergePatch(result[key], value);
    }
  });
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" &&
    value !== null &&
    !Array.isArray(value);
}
