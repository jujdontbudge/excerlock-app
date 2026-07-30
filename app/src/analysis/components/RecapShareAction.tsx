import { useState } from "react";
import { View } from "react-native";

import {
  createRecapShareCardInput,
  ShareCardPreviewSheet,
  type RecapShareCardInput,
  type ShareCardModule,
} from "@/shareCards";
import { PillButton, useTheme } from "@/ui";

import type { Recap } from "../model";

type RecapShareActionProps = Readonly<{
  recap: Recap;
  module?: ShareCardModule;
}>;

export function RecapShareAction({ recap, module }: RecapShareActionProps) {
  const { spacing } = useTheme();
  const [visible, setVisible] = useState(false);
  const input = projectRecapForSharing(recap);

  if (input === null) return null;

  return (
    <View style={{ marginTop: spacing.lg }}>
      <PillButton label="Share" onPress={() => setVisible(true)} />
      <ShareCardPreviewSheet
        visible={visible}
        input={input}
        {...(module === undefined ? {} : { module })}
        onClose={() => setVisible(false)}
      />
    </View>
  );
}

/** The only bridge from Analysis' rich recap to the public-card projection. */
function projectRecapForSharing(recap: Recap): RecapShareCardInput | null {
  if (recap.reclaimed.status !== "measured") return null;

  return createRecapShareCardInput({
    reclaimedMinutes: recap.reclaimed.reclaimedMinutes,
    activeDays: recap.activeDays,
    scheduledActiveDays: recap.dayCount,
    earnCount: recap.activityCount,
    weekDateRange: recap.rangeLabel,
  });
}
