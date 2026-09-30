import { useLocalSearchParams } from 'expo-router';
import { TreadmillUnlockScreen } from '../../src/packages/unlock/TreadmillUnlockScreen';
import { UnlockModal } from '../../src/packages/unlock/UnlockModal';
import { useDevProtectedRouteMount } from '../../src/packages/launch/DevProtectedRouteMount';
export default function TreadmillUnlockRoute() {
  useDevProtectedRouteMount();
  const { ruleId, preview } = useLocalSearchParams<{ ruleId?: string; preview?: string }>();
  return (
    <UnlockModal>
      <TreadmillUnlockScreen ruleId={ruleId} preview={preview === '1'} />
    </UnlockModal>
  );
}
