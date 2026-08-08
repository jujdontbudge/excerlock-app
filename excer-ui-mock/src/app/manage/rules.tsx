import { useRouter, type Href } from 'expo-router';

import { RulesHubScreen, type RuleDestination } from '@/features/manage';
import { useDemo } from '@/presentation';

const routes: Record<RuleDestination, Href> = {
  allowance: '/manage/base-allowance',
  rollover: '/manage/rollover',
  streak: '/manage/streak-policy',
  weekly: '/weekly-rules',
  gyms: '/saved-gyms',
};

export default function RulesHubRoute() {
  const router = useRouter();
  const { state } = useDemo();
  return (
    <RulesHubScreen
      onBack={() => router.back()}
      onOpenRule={(destination) => router.push(routes[destination])}
      onOpenTodayOverride={() => router.push('/weekly-rules?mode=today' as Href)}
      todayValue={state.rules.weekly.todayRestReason ? 'Rest day active' : 'Reason required'}
      values={{
        allowance: state.rules.allowanceMinutes === 'unlimited' ? 'Unlimited' : `${state.rules.allowanceMinutes} min`,
        rollover: state.rules.rolloverEnabled ? `${state.rules.rolloverCapMinutes} min cap` : 'Off',
        streak: state.rules.missedDayPolicy === 'grace' ? 'Automatic cushion' : 'Start over',
        weekly: `${Object.values(state.rules.weekly.dayModes).filter((mode) => mode === 'active').length} active · ${state.rules.weekly.lockWindowEnabled ? `${state.rules.weekly.lockWindowFrom}–${state.rules.weekly.lockWindowTo}` : 'all day'}`,
        gyms: `${state.savedGyms.length} saved`,
      }}
    />
  );
}
