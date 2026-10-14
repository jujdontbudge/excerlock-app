import { useRouter } from 'expo-router';
import { BankDrainDiagnosticScreen } from '../../src/packages/dev-harness/BankDrainDiagnosticScreen';
export default function BankDrainDiagnosticRoute() {
  const router = useRouter();
  return <BankDrainDiagnosticScreen onBack={() => router.canGoBack() ? router.back() : router.replace('/')} />;
}
