import { useLocalSearchParams } from 'expo-router';
import { TreadmillUnlockScreen } from '../../src/packages/unlock/TreadmillUnlockScreen';
import { UnlockModal } from '../../src/packages/unlock/UnlockModal';
export default function TreadmillUnlockRoute() {
  const { ruleId, preview } = useLocalSearchParams<{ ruleId?: string; preview?: string }>();
  return (
    <UnlockModal>
      <TreadmillUnlockScreen ruleId={ruleId} preview={preview === '1'} />
    </UnlockModal>
  );
}
