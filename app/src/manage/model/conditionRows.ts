import type { ConfiguredCondition } from "@excerlock/condition-model";

import { EMPTY_READING, toConditionCards, type ConditionCardModel } from "@/home";

/**
 * One row per saved condition: what it is, where its signal comes from, what it
 * earns, and whether it is switched on.
 *
 * The row is Home's card model with today's progress dropped. Manage lists what
 * a condition *is*, not how it is doing — so it renders the card against an
 * empty reading rather than keeping a second description of the same condition.
 */

export interface ConditionRowModel {
  readonly id: string;
  readonly title: string;
  /** Where the signal comes from — or the saved gym, when the condition has one. */
  readonly sourceLabel: string;
  /** What the condition pays, in its kind's terms. */
  readonly earnLabel: string;
  readonly enabled: boolean;
}

export interface ConditionRowsInput {
  readonly conditions: readonly ConfiguredCondition[];
  readonly disabledConditionIds?: readonly string[];
  readonly placeNames?: Readonly<Record<string, string>>;
}

export function toConditionRows({
  conditions,
  disabledConditionIds = [],
  placeNames = {},
}: ConditionRowsInput): readonly ConditionRowModel[] {
  return toConditionCards({ conditions, reading: EMPTY_READING, placeNames }).map((card) => ({
    id: card.id,
    title: card.title,
    sourceLabel: card.sourceLabel,
    earnLabel: earnLabel(card),
    enabled: !disabledConditionIds.includes(card.id),
  }));
}

function earnLabel(card: ConditionCardModel): string {
  switch (card.kind) {
    case "event":
      return card.goalLabel === undefined
        ? card.rewardLabel
        : `${card.goalLabel} → ${card.rewardLabel}`;
    case "rate":
      return card.ratioLabel;
    case "state":
      return `Unlocked while active · ${card.graceLabel}`;
  }
}
