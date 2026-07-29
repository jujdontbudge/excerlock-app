import { Text, View } from "react-native";

import { Card, PillButton, useTheme } from "@/ui";

import { getAccountModule } from "./accessor";
import type { AccountModule } from "./AccountModule";
import { useAccountSnapshot } from "./useAccountSnapshot";

type AccountSettingsCardProps = {
  account?: AccountModule;
};

export function AccountSettingsCard({
  account = getAccountModule(),
}: AccountSettingsCardProps) {
  const { colors, spacing, typography } = useTheme();
  const snapshot = useAccountSnapshot(account);

  if (snapshot === null) {
    return (
      <Card>
        <Text style={typography.body}>Loading account…</Text>
      </Card>
    );
  }

  if (snapshot.session.status === "signedIn") {
    return (
      <Card style={{ gap: spacing.md }}>
        <Text style={typography.cardTitle}>{snapshot.session.user.email}</Text>
      </Card>
    );
  }

  const isSigningIn = snapshot.intent.status === "signingIn";
  const isSigningUp = snapshot.intent.status === "signingUp";
  const isBusy = snapshot.intent.status !== "idle";

  return (
    <Card style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        <Text style={typography.cardTitle}>Signed out</Text>
        <Text style={typography.body}>
          Your conditions, earning history, and locks stay on this device.
        </Text>
      </View>
      {snapshot.intent.status === "idle" &&
      snapshot.intent.error !== null ? (
        <Text
          accessibilityLabel={snapshot.intent.error.message}
          accessibilityRole="alert"
          style={[typography.body, { color: colors.danger }]}
        >
          {snapshot.intent.error.message}
        </Text>
      ) : null}
      <PillButton
        disabled={isBusy}
        label={isSigningIn ? "Signing in…" : "Sign in"}
        onPress={() => account.signIn()}
        variant="white"
      />
      <PillButton
        disabled={isBusy}
        label={isSigningUp ? "Creating account…" : "Create account"}
        onPress={() => account.signUp()}
        variant="secondary"
      />
    </Card>
  );
}
