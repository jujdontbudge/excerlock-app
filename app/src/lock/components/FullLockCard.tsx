import { useState } from "react";
import { Text, View } from "react-native";

import { Card, PillButton, SectionHeader, useTheme } from "@/ui";

import type { FullLockConfirmation } from "../model/fullLockCopy";
import { FullLockConfirmationPrompt } from "./FullLockConfirmationPrompt";

type FullLockCardProps = {
  on: boolean;
  /** Full Lock only means something once there is a group to shield. */
  hasSelection: boolean;
  confirmation: FullLockConfirmation;
  onToggle: () => Promise<void> | void;
};

/**
 * Full Lock's entry and exit. Both directions confirm: turning it on gives up
 * the day's screen time, and turning it off gives up the day's floor.
 */
export function FullLockCard({
  on,
  hasSelection,
  confirmation,
  onToggle,
}: FullLockCardProps) {
  const { spacing, typography } = useTheme();
  const [confirming, setConfirming] = useState(false);

  if (!hasSelection) {
    return (
      <Card style={{ gap: spacing.md }}>
        <SectionHeader title="Full Lock" />
        <Text style={typography.body}>
          Choose your apps to put Full Lock to work.
        </Text>
      </Card>
    );
  }

  if (confirming) {
    return (
      <Card style={{ gap: spacing.md }}>
        <SectionHeader title="Full Lock" />
        <FullLockConfirmationPrompt
          confirmation={confirmation}
          onConfirm={async () => {
            await onToggle();
            setConfirming(false);
          }}
          onCancel={() => setConfirming(false)}
        />
      </Card>
    );
  }

  return (
    <Card style={{ gap: spacing.md }}>
      <SectionHeader title="Full Lock" />
      <View style={{ gap: spacing.xs }}>
        <Text style={typography.cardTitle}>
          {on ? "Full Lock is on" : "Full Lock is off"}
        </Text>
        <Text style={typography.body}>
          {on
            ? "Your day starts at zero minutes. Earning is the only way in."
            : "Turn it on to start every day shielded until you earn."}
        </Text>
      </View>
      <PillButton
        label={on ? "Turn off Full Lock" : "Turn on Full Lock"}
        onPress={() => setConfirming(true)}
      />
    </Card>
  );
}
