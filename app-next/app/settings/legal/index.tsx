import { useRouter, Href } from 'expo-router';
import { LegalHubScreen } from '../../../src/packages/settings/LegalHubScreen';
export default function LegalHubRoute() {
  const r = useRouter();
  return <LegalHubScreen onBack={() => r.back()} navigate={(p) => r.push(('/settings/' + p) as Href)} />;
}
