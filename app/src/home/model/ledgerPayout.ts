import type { EventReward } from "@excerlock/condition-model";
import type { Payout } from "@excerlock/ledger";

export function toLedgerPayout(reward: EventReward): Payout {
  switch (reward.type) {
    case "fixedMinutes":
      return { type: "fixedChunk", minutes: reward.minutes };
    case "restOfDay":
      return { type: "restOfDay" };
    case "setPeriod":
      return { type: "setPeriod", minutes: reward.durationMinutes };
  }
}
