import { useState } from "react";
import { View } from "react-native";

import { Card, PillButton, useTheme } from "@/ui";

import { getSupportModule } from "../accessor";
import type { SupportModule } from "../SupportModule";
import { useSupportSnapshot } from "../useSupportSnapshot";
import { SubmissionHistory } from "./SubmissionHistory";
import { SupportComposer } from "./SupportComposer";

export function SupportSettingsCard({
  module = getSupportModule(),
}: {
  module?: SupportModule;
}) {
  const { spacing } = useTheme();
  const [isComposerVisible, setComposerVisible] = useState(false);
  const snapshot = useSupportSnapshot(module);

  return (
    <>
      <Card style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <PillButton
            label="Contact support"
            onPress={() => setComposerVisible(true)}
            variant="secondary"
          />
        </View>
        <SubmissionHistory
          submissions={snapshot?.submissions ?? []}
          support={module}
        />
      </Card>
      <SupportComposer
        support={module}
        visible={isComposerVisible}
        onClose={() => setComposerVisible(false)}
      />
    </>
  );
}
