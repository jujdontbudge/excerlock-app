import type { PaywallPlacement } from "@excerlock/analytics-events";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { PillButton, Screen, useTheme } from "@/ui";

import { getSubscriptionModule } from "./accessor";
import { EntitledSubscription } from "./EntitledSubscription";
import { formatConfessedDailyUsage } from "./formatUsage";
import { PaywallLoadError } from "./PaywallLoadError";
import { PaywallProductOption } from "./PaywallProductOption";
import type {
  SubscriptionModule,
  SubscriptionProduct,
} from "./SubscriptionModule";
import { useSubscriptionSnapshot } from "./useSubscriptionSnapshot";

type SubscriptionPaywallProps = {
  placement: PaywallPlacement;
  confessedDailyMinutes: number | null;
  onEntitled: () => void;
  onBack?: () => void;
  subscription?: SubscriptionModule;
};

export function SubscriptionPaywall({
  placement,
  confessedDailyMinutes,
  onEntitled,
  onBack,
  subscription = getSubscriptionModule(),
}: SubscriptionPaywallProps) {
  const { colors, spacing, typography } = useTheme();
  const snapshot = useSubscriptionSnapshot(subscription, placement);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );

  if (snapshot?.entitlement.status === "active") {
    return (
      <EntitledSubscription onContinue={onEntitled} onBack={onBack} />
    );
  }

  if (snapshot?.paywall.status === "error") {
    return (
      <PaywallLoadError
        message={snapshot.paywall.error.message}
        onRetry={() => subscription.loadPaywall(placement)}
        onBack={onBack}
      />
    );
  }

  if (snapshot === null || snapshot.paywall.status !== "ready") {
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
          <Text style={typography.body}>Loading plans…</Text>
        </View>
      </Screen>
    );
  }

  const paywall = snapshot.paywall.paywall;
  const selectedProduct =
    paywall.products.find((product) => product.id === selectedProductId) ??
    paywall.products.find((product) => product.isDefault) ??
    paywall.products[0];
  const isPurchasing = snapshot.intent.status === "purchasing";
  const isRestoring = snapshot.intent.status === "restoring";
  const isBusy = snapshot.intent.status !== "idle";

  const handlePurchase = async () => {
    if (selectedProduct === undefined) {
      return;
    }
    const result = await subscription.purchase(selectedProduct.id);
    if (result.status === "purchased") {
      onEntitled();
    }
  };

  const handleRestore = async () => {
    const result = await subscription.restore();
    if (result.status === "restored") {
      onEntitled();
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
            {paywall.title}
          </Text>
          <Text style={[typography.body, { textAlign: "center" }]}>
            {paywall.body}
          </Text>
          <Text style={[typography.body, { textAlign: "center" }]}>
            {`You told us ${formatConfessedDailyUsage(confessedDailyMinutes)} a day. ${paywall.valueStatement}`}
          </Text>
        </View>

        <View style={{ gap: spacing.md }}>
          <Text style={typography.cardTitle}>Annual and monthly plans</Text>
          {paywall.products.map((product) => (
            <PaywallProductOption
              key={product.id}
              product={product}
              selected={product.id === selectedProduct?.id}
              onSelect={() => setSelectedProductId(product.id)}
            />
          ))}
          <Text style={typography.body}>
            Trial available on the annual plan
          </Text>
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
        </View>

        <View style={{ gap: spacing.md }}>
          <PillButton
            disabled={selectedProduct === undefined || isBusy}
            label={isPurchasing ? "Purchasing…" : purchaseLabel(selectedProduct)}
            onPress={handlePurchase}
            trailingIcon="arrowRight"
            variant="white"
          />
          <PillButton
            disabled={isBusy}
            label={isRestoring ? "Restoring…" : "Restore Purchases"}
            onPress={handleRestore}
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

function purchaseLabel(product: SubscriptionProduct | undefined): string {
  if (product === undefined) {
    return "Choose a plan";
  }
  return product.trialDays > 0
    ? "Start free trial"
    : `Continue with ${product.title.toLowerCase()}`;
}
