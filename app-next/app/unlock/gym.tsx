import { useLocalSearchParams } from 'expo-router';
import { GymUnlockScreen } from '../../src/packages/unlock/GymUnlockScreen';
import { UnlockModal } from '../../src/packages/unlock/UnlockModal';
import { useDevProtectedRouteMount } from '../../src/packages/launch/DevProtectedRouteMount';
export default function GymUnlockRoute() {
  useDevProtectedRouteMount();
  const { ruleId, preview } = useLocalSearchParams<{ ruleId?: string; preview?: string }>();
  return (
    <UnlockModal>
      <GymUnlockScreen ruleId={ruleId} preview={preview === '1'} />
    </UnlockModal>
  );
}
