import type {
  ClientEventName,
  PropsOf,
} from "@excerlock/analytics-events";

import type { AnalyticsPayload } from "./sink";

type ClientPropertyPolicy = {
  [Event in ClientEventName]: readonly Extract<keyof PropsOf<Event>, string>[];
};

/**
 * Runtime allowlist at the final client transport boundary. TypeScript rejects
 * excess properties at normal call sites; this second layer also protects
 * JavaScript callers and future adapters from appending private device data.
 *
 * Empty rows intentionally preserve only the occurrence count. Their declared
 * properties describe health, motion, workout, balance, or Screen Time state
 * and therefore stay on-device under the App Store privacy commitment.
 */
const TRANSMITTED_PROPERTIES = {
  onboarding_screen_viewed: ["screen"],
  onboarding_answer: ["screen", "value"],
  condition_created: [],
  condition_edited: [],
  condition_deleted: [],
  earn_claimed: [],
  sick_day_override_used: [],
  shields_applied: [],
  shields_lifted: [],
  shield_screen_opened: [],
  walk_session_started: [],
  walk_session_ended: [],
  paywall_viewed: ["placement", "has_trial"],
  purchase_started: ["placement", "plan_id"],
  milestone_unlocked: [],
  share_card_shared: ["card", "format"],
  notification_toggled: ["type", "is_enabled"],
  notification_opened: ["type"],
  rating_prompt_shown: ["source"],
  diagnostics_shared: [],
  data_export_requested: [],
} as const satisfies ClientPropertyPolicy;

export function sanitizeAnalyticsProperties(
  event: ClientEventName,
  properties: AnalyticsPayload,
): AnalyticsPayload {
  const allowed = TRANSMITTED_PROPERTIES[event] as readonly string[];
  return Object.fromEntries(
    allowed.flatMap((key) => {
      const value = properties[key];
      return value === undefined ? [] : [[key, value]];
    }),
  );
}
