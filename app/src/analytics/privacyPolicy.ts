import type {
  ClientEventName,
} from "@excerlock/analytics-events";
import { transmittedPropertiesOf } from "@excerlock/analytics-events";

import type { AnalyticsPayload } from "./sink";

/**
 * Runtime allowlist at the final client transport boundary. TypeScript rejects
 * excess properties at normal call sites; this second layer also protects
 * JavaScript callers and future adapters from appending private device data.
 *
 * Empty rows intentionally preserve only the occurrence count. Their declared
 * properties describe health, motion, workout, balance, or Screen Time state
 * and therefore stay on-device under the App Store privacy commitment.
 */
export function sanitizeAnalyticsProperties(
  event: ClientEventName,
  properties: AnalyticsPayload,
): AnalyticsPayload {
  const allowed = transmittedPropertiesOf(event);
  return Object.fromEntries(
    allowed.flatMap((key) => {
      const value = properties[key];
      return value === undefined ? [] : [[key, value]];
    }),
  );
}
