/**
 * Detection constant, not a user setting. Device spike 3 owns final tuning.
 * The ticket #4 starting value is the midpoint of the approved 60–70 steps/min range.
 */
export const WALK_CADENCE_THRESHOLD_STEPS_PER_MINUTE = 65;

/**
 * Live cadence normally arrives every 1–2.5 seconds; the documented gap-repair
 * fallback polls every 5 seconds. Older cadence cannot verify a new activity state.
 */
export const WALK_CADENCE_FRESHNESS_MS = 5_000;

/**
 * Consecutive cadence observations make "sustained" a sensor-window contract
 * without inventing a wall-clock duration that the product has not specified.
 */
export const WALK_REQUIRED_QUALIFYING_CADENCE_SAMPLES = 2;
