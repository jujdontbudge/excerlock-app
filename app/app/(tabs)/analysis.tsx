import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import {
  AnalysisScreen,
  getAnalysisClock,
  getMilestoneHaptics,
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
      clock={getAnalysisClock()}
      milestoneHaptics={getMilestoneHaptics()}
      milestoneUnlockVisitKey={unlockVisitKey}
    />
  );
}
