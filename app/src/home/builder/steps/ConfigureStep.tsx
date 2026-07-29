import type { CatalogId, EventReward } from "@excerlock/condition-model";
import { Text, View } from "react-native";

import { SectionHeader, useTheme } from "@/ui";

import { formatQuantity } from "../../model/duration";
import { configureForm } from "../builderDraft";
import type { BuilderAction, BuilderDraft } from "../builderDraft";
import { OptionPills } from "../components/OptionPills";
import { ValueStepper } from "../components/ValueStepper";

/**
 * Builder step 3–4: the one thing the condition's kind allows, plus the reward
 * menu for events. Every control starts empty.
 */
export function ConfigureStep({
  catalogId,
  draft,
  dispatch,
}: {
  catalogId: CatalogId;
  draft: BuilderDraft;
  dispatch: (action: BuilderAction) => void;
}) {
  const { spacing, typography } = useTheme();
  const form = configureForm(catalogId);

  if (form.kind === "state") {
    return (
      <View style={{ gap: spacing.md }}>
        <SectionHeader
          title="Grace period"
          subtitle="How long the apps stay open after the state ends."
        />
        <OptionPills
          label="Grace period"
          options={form.graceOptionsMs.map((ms) => ({ value: ms, label: graceLabel(ms) }))}
          selected={draft.exitGraceMs}
          onSelect={(value) => dispatch({ type: "setGraceMs", value })}
        />
      </View>
    );
  }

  if (form.kind === "rate") {
    return (
      <View style={{ gap: spacing.md }}>
        <SectionHeader
          title="Exchange rate"
          subtitle="The ratio is the throttle — there is no daily cap."
        />
        <Text style={typography.cardTitle}>
          {`${formatQuantity(form.quantum.value, form.quantum.unit)} =`}
        </Text>
        <ValueStepper
          label="minutes earned"
          range={form.minutes}
          value={draft.rateMinutes}
          onChange={(value) => dispatch({ type: "setRateMinutes", value })}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.lg }}>
      {form.threshold === undefined ? null : (
        <View style={{ gap: spacing.md }}>
          <SectionHeader title="Goal" subtitle="What has to happen before this pays out." />
          <ValueStepper
            label="goal"
            range={form.threshold}
            value={draft.threshold}
            onChange={(value) => dispatch({ type: "setThreshold", value })}
          />
        </View>
      )}

      <View style={{ gap: spacing.md }}>
        <SectionHeader title="Reward" subtitle="What hitting it unlocks." />
        <OptionPills
          label="Reward"
          options={[
            { value: "fixedMinutes", label: "Fixed minutes" },
            { value: "restOfDay", label: "Rest of day" },
            { value: "setPeriod", label: "Set period" },
          ]}
          selected={draft.reward?.type}
          onSelect={(type) => dispatch({ type: "setReward", reward: emptyReward(type) })}
        />
        {rewardMinutes(draft.reward) === undefined ? null : (
          <ValueStepper
            label="reward"
            range={
              draft.reward?.type === "setPeriod"
                ? form.rewardRanges.setPeriod
                : form.rewardRanges.fixedMinutes
            }
            value={rewardMinutes(draft.reward)}
            onChange={(value) =>
              dispatch({
                type: "setReward",
                reward:
                  draft.reward?.type === "setPeriod"
                    ? { type: "setPeriod", durationMinutes: value }
                    : { type: "fixedMinutes", minutes: value },
              })
            }
          />
        )}
      </View>
    </View>
  );
}

/**
 * The no-prefill rule covers thresholds and ratios; the payout *menu* ships all
 * three types (PRD §8). Picking a minute-carrying type therefore lands on its
 * range floor, visible in the stepper the user then moves.
 */
function emptyReward(type: EventReward["type"]): EventReward {
  switch (type) {
    case "restOfDay":
      return { type: "restOfDay" };
    case "setPeriod":
      return { type: "setPeriod", durationMinutes: 15 };
    case "fixedMinutes":
      return { type: "fixedMinutes", minutes: 5 };
  }
}

function rewardMinutes(reward: EventReward | undefined): number | undefined {
  if (reward === undefined || reward.type === "restOfDay") {
    return undefined;
  }
  return reward.type === "setPeriod" ? reward.durationMinutes : reward.minutes;
}

function graceLabel(ms: number): string {
  return ms < 60_000 ? `${Math.round(ms / 1_000)}s` : formatQuantity(Math.round(ms / 60_000), "minute");
}
