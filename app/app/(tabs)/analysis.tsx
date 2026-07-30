import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import {
  AnalysisScreen,
  systemAnalysisClock,
} from "@/analysis";

export default function AnalysisRoute() {
  const [unlockVisitKey, setUnlockVisitKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setUnlockVisitKey((visit) => visit + 1);
    }, []),
  );

  return (
    <AnalysisScreen
      clock={systemAnalysisClock}
      milestoneUnlockVisitKey={unlockVisitKey}
    />
  );
}
