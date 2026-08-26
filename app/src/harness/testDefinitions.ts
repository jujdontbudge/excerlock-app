import type { HarnessTestDefinition } from "./HarnessRunEngine";

export type { HarnessTestDefinition } from "./HarnessRunEngine";

export function assertValidTestDefinitions(
  definitions: readonly HarnessTestDefinition[],
): void {
  const identifiers = new Set<string>();
  for (const definition of definitions) {
    if (identifiers.has(definition.id)) {
      throw new Error(`duplicate test identifier: ${definition.id}`);
    }
    identifiers.add(definition.id);
    if (
      definition.markerLabels.length === 0 ||
      definition.markerLabels.some((label) => label.trim().length === 0)
    ) {
      throw new Error(`${definition.id} requires a labelled marker`);
    }
    if (definition.defaultDurationMs <= 0 || definition.countdownMs < 0) {
      throw new Error(`${definition.id} requires a positive duration`);
    }
  }
}

export const HARNESS_TEST_DEFINITIONS: readonly HarnessTestDefinition[] = [
  {
    id: "marker-only",
    title: "Marker-only harness check",
    kind: "declare-truth",
    countdownMs: 3_000,
    defaultDurationMs: 30_000,
    markerLabels: ["I started", "I stopped"],
    signalSources: [],
  },
  {
    id: "c1-treadmill-walking",
    title: "C1 — treadmill walking",
    kind: "declare-truth",
    countdownMs: 10_000,
    defaultDurationMs: 10_000,
    markerLabels: ["Walking throughout the recording"],
    signalSources: ["camera"],
    panel: "camera-preview",
    handsFreePlan:
      "Frame your shoulders and hips, start the treadmill, then walk throughout the fixed recording window.",
  },
  {
    id: "c2-empty-running-belt",
    title: "C2 — empty running belt",
    kind: "declare-truth",
    countdownMs: 10_000,
    defaultDurationMs: 10_000,
    markerLabels: ["Belt empty throughout the recording"],
    signalSources: ["camera"],
    panel: "camera-preview",
    handsFreePlan:
      "Frame the empty running belt, start it, then remain out of view throughout the fixed recording window.",
  },
];

assertValidTestDefinitions(HARNESS_TEST_DEFINITIONS);
