import type { NotificationTypeId } from "./catalog";

/**
 * Every word this module can put on a lock screen, and the rules that word obeys.
 *
 * PRD §3.14's copy voice is binding, not advisory: "every notification sells a
 * payoff, never audits a failure; lead with what the user gets; title ≤35 chars,
 * body ≤90, no exclamation-mark hype." `violatesCopyVoice` is that paragraph as
 * a function, and the tests run it over every line this file can produce —
 * including the longest number a live title can carry.
 */

export type NotificationContent = Readonly<{
  title: string;
  body: string;
}>;

/** The live numbers a title can interpolate. Both come from the ledger, never from a server. */
export type NotificationCopyFacts = Readonly<{
  reclaimedMinutesThisWeek: number;
  streakDays: number;
}>;

export const MAX_TITLE_LENGTH = 35;
export const MAX_BODY_LENGTH = 90;

/** The guilt vocabulary. "You failed" is banned by name in the PRD; these are its family. */
export const BANNED_COPY_WORDS: readonly string[] = Object.freeze([
  "failed",
  "failing",
  "failure",
  "missed",
  "lazy",
  "excuse",
  "guilty",
  "shame",
  "slacked",
  "slacking",
  "skipped",
  "wasted",
]);

const BANNED_WORD_PATTERN = new RegExp(
  `\\b(${BANNED_COPY_WORDS.join("|")})\\b`,
  "i",
);

/**
 * `0m` · `45m` · `2h` · `6h 20m`.
 *
 * Deliberately a local copy of Analysis's `formatMinutes` rather than an import:
 * `@/analysis` publishes only its screen and view model, and a notification title
 * has a 35-character budget no other surface has. Collapse the two the day
 * Analysis exports its formatter.
 */
function formatReclaimed(minutes: number): string {
  const whole = Math.max(0, Math.round(minutes));
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;

  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

export function afternoonNudgeContent(): NotificationContent {
  return {
    title: "Your screen time is waiting",
    body: "A quick workout unlocks your apps for tonight.",
  };
}

export function weeklyRecapContent(
  reclaimedMinutesThisWeek: number,
): NotificationContent {
  return {
    title: `You reclaimed ${formatReclaimed(reclaimedMinutesThisWeek)} this week`,
    body: "See your week + grab your share card.",
  };
}

export function streakLastCallContent(streakDays: number): NotificationContent {
  return {
    title: `${Math.max(0, Math.round(streakDays))}-day streak on the line`,
    body: "There's still time today — one workout keeps it alive.",
  };
}

export function notificationContent(
  id: NotificationTypeId,
  facts: NotificationCopyFacts,
): NotificationContent {
  switch (id) {
    case "afternoonNudge":
      return afternoonNudgeContent();
    case "weeklyRecap":
      return weeklyRecapContent(facts.reclaimedMinutesThisWeek);
    case "streakLastCall":
      return streakLastCallContent(facts.streakDays);
  }
}

export type CopyVoiceViolation =
  | "title-length"
  | "body-length"
  | "exclamation"
  | "guilt";

/** Empty means the line ships. Anything else names which rule it broke. */
export function violatesCopyVoice({
  title,
  body,
}: NotificationContent): readonly CopyVoiceViolation[] {
  const violations: CopyVoiceViolation[] = [];

  if (title.length > MAX_TITLE_LENGTH) violations.push("title-length");
  if (body.length > MAX_BODY_LENGTH) violations.push("body-length");
  if (`${title} ${body}`.includes("!")) violations.push("exclamation");
  if (BANNED_WORD_PATTERN.test(`${title} ${body}`)) violations.push("guilt");

  return violations;
}
