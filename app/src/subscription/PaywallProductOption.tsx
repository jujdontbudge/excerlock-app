import { Pressable, Text, View } from "react-native";

import { Card, useTheme } from "@/ui";

import type { SubscriptionProduct } from "./SubscriptionModule";

type PaywallProductOptionProps = {
  product: SubscriptionProduct;
  selected: boolean;
  onSelect: () => void;
};

export function PaywallProductOption({
  product,
  selected,
  onSelect,
}: PaywallProductOptionProps) {
  const { spacing, typography } = useTheme();

  return (
    <Pressable
      accessibilityLabel={`${product.title}, ${product.price}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onSelect}
    >
      <Card variant={selected ? "elevated" : "default"}>
        <View style={{ gap: spacing.xs }}>
          <Text style={typography.cardTitle}>{product.title}</Text>
          <Text style={typography.numeric}>{product.price}</Text>
          <Text style={typography.body}>{product.detail}</Text>
          {product.badge === null ? null : (
            <Text style={typography.caption}>{product.badge}</Text>
          )}
        </View>
      </Card>
    </Pressable>
  );
}
