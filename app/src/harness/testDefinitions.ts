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
    signalSources: ["motion"],
  },
  {
    id: "M6",
    title: "Standing still, scrolling",
    kind: "declare-truth",
    countdownMs: 3_000,
    defaultDurationMs: 300_000,
    markerLabels: [
      "I am stationary",
      "I started scrolling",
      "I stopped scrolling",
    ],
    signalSources: ["motion"],
  },
  {
    id: "M7",
    title: "Sitting, scrolling",
    kind: "declare-truth",
    countdownMs: 3_000,
    defaultDurationMs: 300_000,
    markerLabels: [
      "I am stationary",
      "I started scrolling",
      "I stopped scrolling",
    ],
    signalSources: ["motion"],
  },
];

assertValidTestDefinitions(HARNESS_TEST_DEFINITIONS);
