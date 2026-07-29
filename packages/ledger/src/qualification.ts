/**
 * App-fixed streak floors (PRD §3.13 / §8 — integrity constants, never user-set):
 * a rate condition day is meaningful at ≥ 15 banked minutes, a state condition
 * day at ≥ 10 sustained minutes. Events are meaningful the moment they fire.
 */
export const RATE_STREAK_FLOOR_MINUTES = 15
export const STATE_STREAK_FLOOR_MINUTES = 10
