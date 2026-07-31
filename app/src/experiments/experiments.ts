export type ExperimentFlagName =
  | `exp-${string}-${string}`
  | `gate-${string}`;

type ExperimentDefinition = {
  readonly variants: readonly ["control", ...string[]];
};

export const EXPERIMENTS = {
  "exp-shield-copy-v1": {
    variants: ["control", "treatment"],
  },
} as const satisfies Record<ExperimentFlagName, ExperimentDefinition>;

export type ExperimentFlagKey = keyof typeof EXPERIMENTS;

export type ExperimentVariant<Key extends ExperimentFlagKey> =
  (typeof EXPERIMENTS)[Key]["variants"][number];

export const EXPERIMENT_KEYS = Object.keys(EXPERIMENTS) as ExperimentFlagKey[];

export function isExperimentVariant<Key extends ExperimentFlagKey>(
  key: Key,
  value: unknown,
): value is ExperimentVariant<Key> {
  return (EXPERIMENTS[key].variants as readonly unknown[]).includes(value);
}
