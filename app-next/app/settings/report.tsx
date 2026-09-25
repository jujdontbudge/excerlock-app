import { useRouter } from 'expo-router';
import { ReportProblemScreen } from '../../src/packages/support/ReportProblemScreen';
export default function ReportRoute() {
  const r = useRouter();
  return <ReportProblemScreen onBack={() => r.back()} />;
}
