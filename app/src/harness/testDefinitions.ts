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
    const parameterIds = new Set<string>();
    for (const parameter of definition.parameters ?? []) {
      if (parameter.id.trim().length === 0) {
        throw new Error(`${definition.id} requires a parameter identifier`);
      }
      if (parameter.label.trim().length === 0) {
        throw new Error(`${definition.id} requires a parameter label`);
      }
      if (parameterIds.has(parameter.id)) {
        throw new Error(`${definition.id} has a duplicate parameter identifier`);
      }
      parameterIds.add(parameter.id);
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
    id: "M2",
    title: "Walking outdoors, phone in hand",
    kind: "declare-truth",
    countdownMs: 3_000,
    defaultDurationMs: 300_000,
    markerLabels: [
      "I started walking",
      "The phone is in my hand",
      "I stopped walking",
    ],
    signalSources: ["motion"],
    parameters: [],
  },
  {
    id: "M4",
    title: "Treadmill walking, phone in hand",
    kind: "declare-truth",
    countdownMs: 3_000,
    defaultDurationMs: 300_000,
    markerLabels: [
      "I started walking",
      "The phone is in my hand",
      "I stopped walking",
    ],
    signalSources: ["motion"],
    parameters: [
      {
        id: "treadmillSpeedMph",
        label: "Treadmill speed",
        unit: "mph",
      },
    ],
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
  {
    id: "P3",
    title: "Placement sensor only: phone propped on a running belt",
    kind: "declare-truth",
    countdownMs: 10_000,
    defaultDurationMs: 120_000,
    markerLabels: ["The phone is propped", "The belt is running"],
    signalSources: ["placement"],
    handsFreePlan:
      "No camera. This only checks that the motion sensors call the phone propped while the belt vibrates.",
  },
  {
    id: "t1-propped-flow",
    title: "T1 — the real propped flow",
    kind: "declare-truth",
    countdownMs: 10_000,
    defaultDurationMs: 180_000,
    markerLabels: [
      "I propped the phone",
      "I see myself walking in the preview",
      "I picked the phone up",
      "I set it down again",
    ],
    signalSources: ["motion", "placement", "camera"],
    panel: "camera-preview",
    handsFreePlan:
      "Walk holding the phone, then prop it so the preview shows your shoulders and hips and keep walking. Later pick it up while walking, then set it down again. Press each button as you do it.",
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
