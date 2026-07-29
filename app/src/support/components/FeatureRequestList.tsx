import { Text, View } from "react-native";

import { PillButton, useTheme } from "@/ui";

import type { FeatureRequest, SupportModule } from "../SupportModule";

export function FeatureRequestList({
  featureRequests,
  support,
}: {
  featureRequests: readonly FeatureRequest[];
  support: SupportModule;
}) {
  const { spacing, typography } = useTheme();
  if (featureRequests.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={typography.caption}>FEATURE REQUESTS</Text>
      {featureRequests.map((featureRequest) => (
        <View key={featureRequest.id} style={{ gap: spacing.xs }}>
          <Text style={typography.cardTitle}>{featureRequest.title}</Text>
          <Text style={typography.body}>{featureRequest.message}</Text>
          <Text style={typography.caption}>
            {featureRequest.voteCount}{" "}
            {featureRequest.voteCount === 1 ? "vote" : "votes"}
          </Text>
          <PillButton
            disabled={featureRequest.hasVoted}
            label={`${featureRequest.hasVoted ? "Voted for" : "Vote for"} ${featureRequest.title}`}
            onPress={() =>
              void support.voteOnFeatureRequest(featureRequest.id)
            }
            variant="secondary"
          />
        </View>
      ))}
    </View>
  );
}
