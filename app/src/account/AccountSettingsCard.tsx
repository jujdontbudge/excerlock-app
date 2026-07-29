import { useState } from "react";
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
  const [confirmingDeletion, setConfirmingDeletion] = useState(false);
  const deleteAccount = () => {
    void account.deleteAccount().then((result) => {
      if (result.status === "deleted") {
        setConfirmingDeletion(false);
      }
    });
  };

  if (snapshot === null) {
    return (
      <Card>
        <Text style={typography.body}>Loading account…</Text>
      </Card>
    );
  }

  if (snapshot.session.status === "signedIn") {
    const isSigningOut = snapshot.intent.status === "signingOut";
    const isDeleting = snapshot.intent.status === "deleting";
    const isBusy = snapshot.intent.status !== "idle";

    if (confirmingDeletion) {
      return (
        <Card style={{ gap: spacing.md }}>
          <Text accessibilityRole="header" style={typography.cardTitle}>
            Delete your account forever?
          </Text>
          <Text style={typography.body}>
            Your Clerk account and ExcerLock server record will be permanently
            deleted. Adapty and PostHog erasure will be scheduled.
          </Text>
          <Text style={typography.body}>
            All on-device data—including conditions, earning history, lock
            choices, and settings—remains on this device.
          </Text>
          <Text style={typography.body}>
            Deleting your account does not cancel an App Store subscription.
          </Text>
          <Text style={typography.body}>This cannot be undone.</Text>
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
            label="Keep my account"
            onPress={() => setConfirmingDeletion(false)}
            variant="white"
          />
          <PillButton
            disabled={isBusy}
            label={isDeleting ? "Deleting account…" : "Delete account forever"}
            onPress={deleteAccount}
            variant="secondary"
          />
        </Card>
      );
    }

    return (
      <Card style={{ gap: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <Text style={typography.cardTitle}>Signed in</Text>
          <Text style={typography.body}>{snapshot.session.user.email}</Text>
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
          label={isSigningOut ? "Signing out…" : "Sign out"}
          onPress={() => account.signOut()}
          variant="secondary"
        />
        <PillButton
          disabled={isBusy}
          label={isDeleting ? "Deleting account…" : "Delete account"}
          onPress={() => setConfirmingDeletion(true)}
          variant="secondary"
        />
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
