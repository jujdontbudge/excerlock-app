import { useLocalSearchParams } from 'expo-router';
import { GymUnlockScreen } from '../../src/features/unlock/GymUnlockScreen';
import { UnlockModal } from '../../src/features/unlock/UnlockModal';
export default function GymUnlockRoute() {
  const { ruleId, preview } = useLocalSearchParams<{ ruleId?: string; preview?: string }>();
  return (
    <UnlockModal>
      <GymUnlockScreen ruleId={ruleId} preview={preview === '1'} />
    </UnlockModal>
  );
}
