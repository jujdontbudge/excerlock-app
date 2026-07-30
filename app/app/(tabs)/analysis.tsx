import {
  AnalysisScreen,
  systemAnalysisClock,
} from "@/analysis";

export default function AnalysisRoute() {
  return <AnalysisScreen clock={systemAnalysisClock} />;
}
