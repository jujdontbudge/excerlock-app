import { useRouter } from 'expo-router';
import { ReportProblemScreen } from '../../src/features/settings/ReportProblemScreen';
export default function ReportRoute() {
  const r = useRouter();
  return <ReportProblemScreen onBack={() => r.back()} />;
}
