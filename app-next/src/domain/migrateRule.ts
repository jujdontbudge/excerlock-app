// merge: fold this walking branch into P2-T14's migrateRule implementation.
export function migrateRule(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return value;
  const rule = value as Record<string, unknown>;
  const candidate = rule.mode;
  if (
    typeof candidate === 'object' &&
    candidate !== null &&
    !Array.isArray(candidate)
  ) {
    const mode = candidate as Record<string, unknown>;
    if (
    mode.kind === 'target' &&
    mode.activity === 'walking' &&
    mode.metric === 'steps' &&
    mode.place === 'treadmill'
    ) {
      return { ...rule, mode: { ...mode, place: 'either' } };
    }
  }
  return value;
}
