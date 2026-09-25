import { useRouter, useLocalSearchParams } from 'expo-router';
import { SettingsPage } from '../../../src/packages/ui/SettingsPage';
import { LegalScreen } from '../../../src/packages/settings/LegalScreen';
export default function LegalRoute() {
  const r = useRouter(),
    { doc } = useLocalSearchParams<{ doc: string }>();
  return (
    <SettingsPage onBack={() => r.back()}>
      <LegalScreen doc={doc === 'terms' ? 'terms' : 'privacy'} />
    </SettingsPage>
  );
}
