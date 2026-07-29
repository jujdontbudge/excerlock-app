/**
 * The notification set, closed.
 *
 * PRD §3.14 (grill, 2026-07-28) settled this list and nothing may be added to it
 * here: the app ships silent, three push types exist, every one defaults OFF.
 * The surfaces the PRD listed as *in-app only* — balance running low, balance
 * empty / shields up, presence cooldown not met, milestone unlocked — have no
 * entry in this table on purpose, and neither do the two removed types (*earn
 * verified*, *day-boundary state*). A new push type is a PRD change first.
 */

/** Every route named here must resolve to a live thin route in `app/app`. */
export type NotificationRoute = "/(tabs)" | "/(tabs)/analysis";

export type NotificationTypeId =
  | "afternoonNudge"
  | "weeklyRecap"
  | "streakLastCall";

export type NotificationType = Readonly<{
  id: NotificationTypeId;
  /** The Settings toggle's label — one row per type is what makes each silenceable. */
  settingsTitle: string;
  settingsDescription: string;
  /** PRD §3.14 delivery rule: every notification deep-links to its surface. */
  route: NotificationRoute;
  /**
   * `false` only for the streak last-call, which "may exceed the 1/day cap on
   * danger days (enabling it is explicit consent)". The rolling-7-day ceiling
   * still applies to it — the PRD stated that exception for the daily cap alone.
   */
  countsAgainstDailyCap: boolean;
  /**
   * Who wins when two capped types want the same day. The recap outranks the
   * nudge: it happens once a week and carries the week's payoff, while the nudge
   * gets another chance tomorrow.
   */
  dailyCapPriority: number;
}>;

export const NOTIFICATION_TYPES: readonly NotificationType[] = Object.freeze([
  Object.freeze({
    id: "afternoonNudge",
    settingsTitle: "Afternoon nudge",
    settingsDescription:
      "On active days with no workout yet, one reminder at your chosen time. Opening the app first cancels it.",
    route: "/(tabs)",
    countsAgainstDailyCap: true,
    dailyCapPriority: 1,
  }),
  Object.freeze({
    id: "weeklyRecap",
    settingsTitle: "Weekly recap",
    settingsDescription:
      "Once a week, the hours you reclaimed and your share card.",
    route: "/(tabs)/analysis",
    countsAgainstDailyCap: true,
    dailyCapPriority: 2,
  }),
  Object.freeze({
    id: "streakLastCall",
    settingsTitle: "Streak last call",
    settingsDescription:
      "An evening heads-up when your streak is still unmet. This one can arrive on a day you already heard from us.",
    route: "/(tabs)",
    countsAgainstDailyCap: false,
    dailyCapPriority: 3,
  }),
] satisfies readonly NotificationType[]);

export const NOTIFICATION_TYPE_IDS: readonly NotificationTypeId[] =
  Object.freeze(NOTIFICATION_TYPES.map((type) => type.id));

const BY_ID: Readonly<Record<NotificationTypeId, NotificationType>> =
  Object.freeze(
    Object.fromEntries(NOTIFICATION_TYPES.map((type) => [type.id, type])) as
      Record<NotificationTypeId, NotificationType>,
  );

export function getNotificationType(id: NotificationTypeId): NotificationType {
  return BY_ID[id];
}
