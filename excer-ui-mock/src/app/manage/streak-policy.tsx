import { useRouter } from 'expo-router';

import { StreakPolicyScreen } from '@/features/manage';
import { useDemo } from '@/presentation';

export default function StreakPolicyRoute() {
  const router = useRouter();
  const { state, dispatch } = useDemo();
  return (
    <StreakPolicyScreen
      onBack={() => router.back()}
      onLearnMore={() => router.push('/support/help?article=streaks')}
      onSelect={(value) => dispatch({ type: 'rules/set-streak-policy', policy: value === 'hard-reset' ? 'reset' : 'grace' })}
      selected={state.rules.missedDayPolicy === 'reset' ? 'hard-reset' : 'auto-cushion'}
    />
  );
}
