import { useRouter } from 'expo-router';
import { BugReportScreen } from '../../src/features/settings/BugReportScreen';
export default function BugRoute() {
  const r = useRouter();
  return <BugReportScreen onBack={() => r.back()} />;
}
