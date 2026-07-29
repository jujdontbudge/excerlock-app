import { ScrollView, Text, View } from "react-native";

import { PillButton, Screen, useTheme } from "@/ui";

import { getAccountModule } from "./accessor";
import type {
  AccountModule,
  AuthenticationResult,
} from "./AccountModule";
import { useAccountSnapshot } from "./useAccountSnapshot";

type AccountOnboardingProps = {
  onAuthenticated: () => void;
  onBack?: () => void;
  account?: AccountModule;
};

export function AccountOnboarding({
  onAuthenticated,
  onBack,
  account = getAccountModule(),
}: AccountOnboardingProps) {
  const { colors, spacing, typography } = useTheme();
  const snapshot = useAccountSnapshot(account);

  if (snapshot === null) {
    return (
      <Screen edges={["top", "right", "bottom", "left"]}>
        <View
          style={{
            alignItems: "center",
            flex: 1,
            justifyContent: "center",
            padding: spacing.gutter,
          }}
        >
          <Text style={typography.body}>Loading account…</Text>
        </View>
      </Screen>
    );
  }

  if (snapshot.session.status === "signedIn") {
    return (
      <Screen edges={["top", "right", "bottom", "left"]}>
        <View
          style={{
            flex: 1,
            gap: spacing.lg,
            justifyContent: "center",
            padding: spacing.gutter,
          }}
        >
          <View style={{ alignItems: "center", gap: spacing.md }}>
            <Text
              accessibilityRole="header"
              style={[typography.screenTitle, { textAlign: "center" }]}
            >
              Your account is ready
            </Text>
            <Text style={[typography.body, { textAlign: "center" }]}>
              {snapshot.session.user.email}
            </Text>
          </View>
          <PillButton
            label="Continue"
            onPress={onAuthenticated}
            trailingIcon="arrowRight"
            variant="white"
          />
          {onBack === undefined ? null : (
            <PillButton label="Back" onPress={onBack} variant="secondary" />
          )}
        </View>
      </Screen>
    );
  }

  const isSigningIn = snapshot.intent.status === "signingIn";
  const isSigningUp = snapshot.intent.status === "signingUp";
  const isBusy = snapshot.intent.status !== "idle";
  const finishAuthentication = (result: AuthenticationResult) => {
    if (result.status === "authenticated") {
      onAuthenticated();
    }
  };

  return (
    <Screen edges={["top", "right", "bottom", "left"]}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          gap: spacing.lg,
          justifyContent: "center",
          padding: spacing.gutter,
        }}
      >
        <View style={{ alignItems: "center", gap: spacing.md }}>
          <Text
            accessibilityRole="header"
            style={[typography.screenTitle, { textAlign: "center" }]}
          >
            Create your account
          </Text>
          <Text style={[typography.body, { textAlign: "center" }]}>
            Save your plan and connect account-backed services. Your earning and
            locking data stays on this device.
          </Text>
        </View>

        {snapshot.intent.status === "idle" &&
        snapshot.intent.error !== null ? (
          <Text
            accessibilityLabel={snapshot.intent.error.message}
            accessibilityRole="alert"
            style={[
              typography.body,
              { color: colors.danger, textAlign: "center" },
            ]}
          >
            {snapshot.intent.error.message}
          </Text>
        ) : null}

        <View style={{ gap: spacing.md }}>
          <PillButton
            disabled={isBusy}
            label={isSigningUp ? "Creating account…" : "Create account"}
            onPress={() => account.signUp().then(finishAuthentication)}
            trailingIcon="arrowRight"
            variant="white"
          />
          <PillButton
            disabled={isBusy}
            label={isSigningIn ? "Signing in…" : "Sign in instead"}
            onPress={() => account.signIn().then(finishAuthentication)}
            variant="secondary"
          />
          {onBack === undefined ? null : (
            <PillButton label="Back" onPress={onBack} variant="secondary" />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
