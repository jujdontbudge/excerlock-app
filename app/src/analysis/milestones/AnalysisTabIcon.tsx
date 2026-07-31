import type { ColorValue } from "react-native";
import { View } from "react-native";

import { colors, radius, TabBarIcon } from "@/ui";

import { MILESTONES } from "./catalog";
import { useMilestoneUnlockStore } from "./unlockStore";

type AnalysisTabIconProps = Readonly<{
  color: ColorValue;
  size?: number;
}>;

export function AnalysisTabIcon({
  color,
  size = 26,
}: AnalysisTabIconProps) {
  const hasPendingUnlock = useMilestoneUnlockStore((state) =>
    MILESTONES.some(({ id }) => state.records[id]?.pending === true),
  );

  return (
    <View style={{ height: size, width: size }}>
      <TabBarIcon icon="analysis" color={color} size={size} />
      {hasPendingUnlock ? (
        <View
          accessible
          accessibilityLabel="New milestone waiting in Analysis"
          testID="analysis-tab-milestone-dot"
          style={{
            backgroundColor: colors.primary,
            borderColor: colors.bgNight,
            borderRadius: radius.pill,
            borderWidth: 1.5,
            height: 9,
            position: "absolute",
            right: -1,
            top: -1,
            width: 9,
          }}
        />
      ) : null}
    </View>
  );
}
