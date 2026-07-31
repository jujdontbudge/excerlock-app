import {
  getCatalogEntry,
  type ConfiguredCondition,
  type EventReward,
} from "@excerlock/condition-model";

import { formatQuantity } from "@/home/model/duration";
import type { SignalReading } from "@/home/model/reading";
import { formatWallClockTime } from "@/lock/model/wallClock";

import type { ShieldCause } from "./ShieldContentPublisher";

export type UnlockOfferInput = Readonly<{
  cause: ShieldCause;
  conditions: readonly ConfiguredCondition[];
  reading: SignalReading;
  lockWindowEndsAtMs?: number;
}>;

type RankedOffer = Readonly<{ subtitle: string; completionCost: number }>;

/**
 * Chooses the actionable condition closest to paying out. Event progress is a
 * fraction of its own configured goal, so unlike raw steps/miles/calories it
 * never compares incompatible health units. Immediate state/event paths rank
 * first; a rate quantum ranks after an almost-complete event.
 */
export function resolveCheapestUnlockOffer(input: UnlockOfferInput): string {
  if (input.cause === "walkAndScrollEnded") {
    return "Start walking again to pick up where you left off.";
  }
  if (
    input.cause === "lockWindow" &&
    input.lockWindowEndsAtMs !== undefined
  ) {
    return `Back at ${formatWallClockTime(input.lockWindowEndsAtMs)}.`;
  }

  const offers = input.conditions.flatMap((condition) =>
    offerForCondition(condition, input.reading),
  );
  const cheapest = offers.sort(
    (left, right) => left.completionCost - right.completionCost,
  )[0];
  return cheapest?.subtitle ?? fallbackSubtitle(input.cause);
}

function offerForCondition(
  condition: ConfiguredCondition,
  reading: SignalReading,
): readonly RankedOffer[] {
  const entry = getCatalogEntry(condition.catalogId);
  switch (condition.settings.kind) {
    case "state":
      return [
        {
          completionCost: 0,
          subtitle:
            entry.signal === "walking"
              ? "Start walking to unlock your apps."
              : `Start ${entry.name.toLowerCase()} to unlock your apps.`,
        },
      ];
    case "rate": {
      if (entry.picker.type !== "rate") {
        return [];
      }
      const amount = entry.picker.quantum.value;
      const minutes = amount * condition.settings.reward.minutesPerUnit;
      return [{
        completionCost: 1,
        subtitle: `${formatQuantity(amount, entry.picker.quantum.unit)} gets you ${formatOfferMinutes(minutes)}.`,
      }];
    }
    case "event": {
      if (condition.settings.threshold === undefined) {
        return [{
          completionCost: 0,
          subtitle: `Complete ${entry.name.toLowerCase()} to unlock ${rewardText(condition.settings.reward)}.`,
        }];
      }
      if (entry.picker.type !== "threshold") {
        return [];
      }
      const total = reading.totals[entry.signal] ?? 0;
      const remaining = Math.max(0, condition.settings.threshold - total);
      if (remaining === 0) {
        return [];
      }
      return [{
        completionCost: remaining / condition.settings.threshold,
        subtitle: `${formatQuantity(remaining, entry.picker.range.unit)} gets you ${rewardText(condition.settings.reward)}.`,
      }];
    }
  }
}

function rewardText(reward: EventReward): string {
  switch (reward.type) {
    case "fixedMinutes":
      return formatOfferMinutes(reward.minutes);
    case "setPeriod":
      return formatOfferMinutes(reward.durationMinutes);
    case "restOfDay":
      return "the rest of today";
  }
}

function formatOfferMinutes(minutes: number): string {
  const rounded = Math.round(minutes * 10) / 10;
  return `${rounded} more ${rounded === 1 ? "minute" : "minutes"}`;
}

function fallbackSubtitle(cause: ShieldCause): string {
  switch (cause) {
    case "balanceEmpty":
    case "fullLock":
      return "Open ExcerLock to choose your fastest unlock.";
    case "lockWindow":
      return "Open ExcerLock to see when this lock window ends.";
    case "walkAndScrollEnded":
      return "Start walking again to pick up where you left off.";
  }
}
