import type {
  EnforcementAppState,
  EnforcementSource,
  ShieldsAppliedCause,
  ShieldsLiftedReason,
} from '@excerlock/analytics-events';
import type { EnforcementSnapshot } from './EnforcementHost';

export type AppliedPolicy = Pick<EnforcementSnapshot, 'state' | 'relief' | 'openReason'>;

export type EnforcementContext = { appState: EnforcementAppState; source: EnforcementSource };

export type EnforcementAnalyticsEvent =
  | { name: 'unlock_completed'; props: { method: 'walking' | 'propped' | 'gym' } & EnforcementContextProps }
  | { name: 'shields_lifted'; props: { reason: ShieldsLiftedReason } & EnforcementContextProps }
  | { name: 'shields_applied'; props: { cause: ShieldsAppliedCause } & EnforcementContextProps };

type EnforcementContextProps = { app_state: EnforcementAppState; source: EnforcementSource };

const METHOD = { unlockedWalking: 'walking', unlockedPropped: 'propped', unlockedAtGym: 'gym' } as const;
const OPEN_REASON: Record<NonNullable<AppliedPolicy['openReason']>, ShieldsLiftedReason> = {
  earned: 'earned', outsideWindow: 'window_end', lapsed: 'lapsed', disabled: 'disabled', deleting: 'deleting',
};

export function enforcementTransitionEvents(
  previous: AppliedPolicy | null,
  next: AppliedPolicy,
  context: EnforcementContext,
): EnforcementAnalyticsEvent[] {
  const props = { app_state: context.appState, source: context.source };
  const before = previous && previous.state !== 'unknown' ? previous.state : null;
  if (next.state === 'unknown' || before === next.state) return [];
  if (next.state === 'shield')
    return [{ name: 'shields_applied', props: { ...props, cause: before === null ? 'boot' : before === 'conditional' ? 'relock' : 'window_start' } }];
  if (before === 'conditional' || (before === null && next.state === 'open')) return [];
  const lifted: EnforcementAnalyticsEvent = next.state === 'conditional'
    ? { name: 'shields_lifted', props: { ...props, reason: METHOD[next.relief] } }
    : { name: 'shields_lifted', props: { ...props, reason: OPEN_REASON[next.openReason ?? 'outsideWindow'] } };
  return before === 'shield' && next.state === 'conditional'
    ? [{ name: 'unlock_completed', props: { ...props, method: METHOD[next.relief] } }, lifted]
    : [lifted];
}
