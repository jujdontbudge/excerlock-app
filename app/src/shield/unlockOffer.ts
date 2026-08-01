import {
  getCatalogEntry,
  type ConfiguredCondition,
  type EventReward,
  type PickerUnit,
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

type OfferEffort =
  | Readonly<{ kind: "immediate" }>
  | Readonly<{ kind: "quantity"; amount: number; unit: PickerUnit }>;

type RankedOffer = Readonly<{ subtitle: string; effort: OfferEffort }>;

/**
 * Chooses the least remaining real cost without inventing cross-unit math.
 * Immediate state/event paths rank first. Quantified paths compare their live
 * remaining amount only when their units match; otherwise configured order is
 * preserved because steps, miles, calories, and minutes are not interchangeable.
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
  const cheapest = offers.sort(compareOfferEffort)[0];
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
          effort: { kind: "immediate" },
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
        effort: {
          kind: "quantity",
          amount,
          unit: entry.picker.quantum.unit,
        },
        subtitle: `${formatQuantity(amount, entry.picker.quantum.unit)} gets you ${formatOfferMinutes(minutes)}.`,
      }];
    }
    case "event": {
      if (condition.settings.threshold === undefined) {
        return [{
          effort: { kind: "immediate" },
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
        effort: {
          kind: "quantity",
          amount: remaining,
          unit: entry.picker.range.unit,
        },
        subtitle: `${formatQuantity(remaining, entry.picker.range.unit)} gets you ${rewardText(condition.settings.reward)}.`,
      }];
    }
  }
}

function compareOfferEffort(left: RankedOffer, right: RankedOffer): number {
  if (left.effort.kind === "immediate") {
    return right.effort.kind === "immediate" ? 0 : -1;
  }
  if (right.effort.kind === "immediate") {
    return 1;
  }
  return left.effort.unit === right.effort.unit
    ? left.effort.amount - right.effort.amount
    : 0;
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
