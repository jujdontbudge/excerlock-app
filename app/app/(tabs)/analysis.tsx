import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import {
  AnalysisScreen,
  getMilestoneHaptics,
  systemAnalysisClock,
} from "@/analysis";

export default function AnalysisRoute() {
  const [unlockVisitKey, setUnlockVisitKey] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      setUnlockVisitKey((visit) => (visit ?? 0) + 1);
    }, []),
  );

  return (
    <AnalysisScreen
      clock={systemAnalysisClock}
      milestoneHaptics={getMilestoneHaptics()}
      milestoneUnlockVisitKey={unlockVisitKey}
    />
  );
}
