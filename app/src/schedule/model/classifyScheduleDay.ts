export type ScheduledActiveDay = Readonly<{
  kind: "scheduledActive";
  isActive: true;
}>;

export type ClassifyScheduleDayInput = Readonly<{
  dayIndex: number;
}>;

/**
 * The local-first fallback: until a schedule exists, no day is withheld from
 * the normal earning and locking economy.
 */
export function classifyScheduleDay(
  _input: ClassifyScheduleDayInput,
): ScheduledActiveDay {
  return { kind: "scheduledActive", isActive: true };
}
