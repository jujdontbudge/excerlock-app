import { useState } from "react";
import { View } from "react-native";

import { Card, PillButton, useTheme } from "@/ui";

import { getSupportModule } from "../accessor";
import type { SupportModule } from "../SupportModule";
import { useSupportSnapshot } from "../useSupportSnapshot";
import { FeatureRequestList } from "./FeatureRequestList";
import { SubmissionHistory } from "./SubmissionHistory";
import { SupportComposer } from "./SupportComposer";

export function SupportSettingsCard({
  module = getSupportModule(),
}: {
  module?: SupportModule;
}) {
  const { spacing } = useTheme();
  const [composerKind, setComposerKind] = useState<
    "support" | "feature" | null
  >(null);
  const snapshot = useSupportSnapshot(module);

  return (
    <>
      <Card style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <PillButton
            label="Contact support"
            onPress={() => setComposerKind("support")}
            variant="secondary"
          />
          <PillButton
            label="Request a feature"
            onPress={() => setComposerKind("feature")}
            variant="secondary"
          />
        </View>
        <SubmissionHistory
          submissions={snapshot?.submissions ?? []}
          support={module}
        />
        <FeatureRequestList
          featureRequests={snapshot?.featureRequests ?? []}
          support={module}
        />
      </Card>
      <SupportComposer
        kind={composerKind ?? "support"}
        support={module}
        visible={composerKind !== null}
        onClose={() => setComposerKind(null)}
      />
    </>
  );
}
