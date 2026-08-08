import { Alert } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { debugContent } from '@/content';
import { SettingsDetailScreen, type SettingsDetailSection } from '@/features/settings';
import {
  useDemo,
  type AccountStatus,
  type GymPhase,
  type HomeMode,
  type NotificationKind,
  type ReviewPromptState,
  type ReviewTrigger,
  type WalkPhase,
} from '@/presentation';

const walkFixtures: ReadonlyArray<{ label: string; phase: WalkPhase }> = [
  { label: 'Ready', phase: 'ready' },
  { label: 'Verifying', phase: 'verifying' },
  { label: 'Active', phase: 'active' },
  { label: 'Paused', phase: 'paused' },
  { label: 'Grace', phase: 'grace' },
  { label: 'Ended by user', phase: 'ended-by-user' },
  { label: 'Ended after stop', phase: 'ended-stopped' },
  { label: 'Permission lost', phase: 'permission-lost' },
];

const gymFixtures: ReadonlyArray<{ label: string; phase: GymPhase }> = [
  { label: 'Ready', phase: 'ready' },
  { label: 'Verifying', phase: 'verifying' },
  { label: 'Verified', phase: 'verified' },
  { label: 'Failed', phase: 'failed' },
];

const homeModes: ReadonlyArray<{ id: string; label: string; mode: HomeMode }> = [
  { id: 'locked', label: 'Locked showcase', mode: 'locked' },
  { id: 'unlocked', label: 'Unlocked · 30 min', mode: 'unlocked' },
  { id: 'low', label: 'Low · 10 min', mode: 'low' },
  { id: 'unlimited', label: 'Unlimited allowance', mode: 'unlimited' },
  { id: 'rest-of-day', label: 'Unlocked for today', mode: 'rest-of-day' },
  { id: 'set-period', label: 'Unlocked until 8:30 PM', mode: 'set-period' },
  { id: 'rest-day-no-locking', label: 'No limits today · Rest day', mode: 'rest-day-no-locking' },
  { id: 'outside-window', label: 'Outside lock window', mode: 'outside-window' },
];

const reviewTriggers: ReadonlyArray<{ label: string; trigger: ReviewTrigger }> = [
  { label: 'Fifth unlock', trigger: 'fifthUnlock' },
  { label: 'Seven days', trigger: 'sevenDays' },
  { label: 'Thirty days', trigger: 'thirtyDays' },
];

const reviewStates: ReadonlyArray<{
  label: string;
  prompt: ReviewPromptState;
  slug: 'eligible' | 'presented' | 'dismissed' | 'rated' | 'suppressed';
}> = [
  { label: 'Eligible', prompt: 'eligible', slug: 'eligible' },
  { label: 'Presented', prompt: 'presented', slug: 'presented' },
  { label: 'Dismissed', prompt: 'dismissed', slug: 'dismissed' },
  { label: 'Rated', prompt: 'rated', slug: 'rated' },
  { label: 'Shield-suppressed', prompt: 'suppressedAfterShield', slug: 'suppressed' },
];

const notificationFixtures: ReadonlyArray<{
  id: string;
  kind: NotificationKind;
  label: string;
  slug: 'nudge' | 'recap' | 'last-call';
}> = [
  { id: 'nudge', kind: 'afternoonNudge', label: 'Afternoon nudge', slug: 'nudge' },
  { id: 'recap', kind: 'weeklyRecap', label: 'Weekly recap', slug: 'recap' },
  { id: 'last-call', kind: 'streakLastCall', label: 'Streak last-call', slug: 'last-call' },
];

const sections: SettingsDetailSection[] = [
  {
    id: 'first-run',
    title: 'FIRST RUN & PURCHASE',
    rows: [
      { id: 'restart-onboarding', title: 'Restart onboarding', subtitle: 'Return to the first value screen' },
      { id: 'paywall-annual', title: 'Paywall · Annual' },
      { id: 'paywall-monthly', title: 'Paywall · Monthly' },
      { id: 'paywall-purchase', title: 'Purchase preview · Confirmation' },
      { id: 'paywall-loading', title: 'Purchase preview · Loading' },
      { id: 'paywall-success', title: 'Purchase preview · Success' },
      { id: 'paywall-failure', title: 'Purchase preview · Failure' },
      { id: 'signup-choice', title: 'Signup · Post-purchase choice' },
      { id: 'signup-email', title: 'Signup · Email validation' },
      { id: 'signup-processing', title: 'Signup · Processing' },
      { id: 'signup-success', title: 'Signup · Success' },
      { id: 'signup-failure', title: 'Signup · Failure' },
    ],
  },
  {
    id: 'identity',
    title: 'IDENTITY',
    rows: [
      { id: 'identity-postPurchase', title: 'Post-purchase · Not saved' },
      { id: 'identity-signedInDemo', title: 'Signed-in demo profile' },
      { id: 'identity-signedOutDemo', title: 'Signed out · Setup kept' },
      { id: 'identity-recovery', title: 'Recovery sign-in' },
    ],
  },
  {
    id: 'home',
    title: 'HOME',
    rows: [
      { id: 'home-empty', title: 'Natural first Home', subtitle: 'Zero conditions' },
      { id: 'home-showcase', title: 'Seed showcase conditions', subtitle: 'Event, state, and rate anchors' },
      ...homeModes.map((fixture) => ({ id: `home-${fixture.id}`, title: fixture.label })),
    ],
  },
  {
    id: 'walk',
    title: 'WALK · ALL 8 PHASES',
    rows: walkFixtures.map((fixture) => ({ id: `walk-${fixture.phase}`, title: `Walk · ${fixture.label}` })),
  },
  {
    id: 'gym',
    title: 'GYM · ALL 4 PHASES',
    rows: gymFixtures.map((fixture) => ({ id: `gym-${fixture.phase}`, title: `Gym · ${fixture.label}` })),
  },
  {
    id: 'analysis',
    title: 'ANALYSIS',
    rows: [
      { id: 'analysis-empty', title: 'Empty history' },
      { id: 'analysis-populated', title: 'Populated sample history' },
      { id: 'analysis-new-badge', title: 'New badge · 50 hours reclaimed' },
    ],
  },
  {
    id: 'permissions',
    title: 'PERMISSION HEALTH',
    rows: [
      { id: 'permission-attention', title: 'Needs attention' },
      { id: 'permission-healthy', title: 'All ready' },
    ],
  },
  {
    id: 'subscription',
    title: 'SUBSCRIPTION',
    rows: [
      { id: 'subscription-trial', title: 'Free trial' },
      { id: 'subscription-active', title: 'Active' },
      { id: 'subscription-cancelled', title: 'Cancelled · Access remains' },
    ],
  },
  {
    id: 'review',
    title: 'REVIEW · EVERY TRIGGER / STATE',
    rows: [
      ...reviewTriggers.flatMap(({ label: triggerLabel, trigger }) =>
        reviewStates.map(({ label: stateLabel, slug }) => ({
          id: `review-${trigger}-${slug}`,
          title: `${triggerLabel} · ${stateLabel}`,
        })),
      ),
      { id: 'review-stopped', title: 'Stopped after three presentations' },
    ],
  },
  {
    id: 'notifications',
    title: 'NOTIFICATION ENTRIES',
    rows: notificationFixtures.flatMap((fixture) => [
      { id: `notification-${fixture.id}-unopened`, title: `${fixture.label} · Unopened` },
      { id: `notification-${fixture.id}-tapped`, title: `${fixture.label} · Tapped` },
    ]),
  },
  {
    id: 'shields',
    title: 'SHIELDS',
    rows: [
      { id: 'shield-balance-empty', title: 'Balance empty' },
      { id: 'shield-full-lock', title: 'Full Lock' },
      { id: 'shield-time-out', title: 'Time out' },
      { id: 'shield-walk-ended', title: 'Walk ended' },
      { id: 'shield-schedule', title: 'Schedule' },
    ],
  },
  {
    id: 'reset',
    rows: [
      {
        destructive: true,
        id: 'reset-all',
        kind: 'action',
        subtitle: 'Confirm, clear every local fixture, and show Splash',
        title: debugContent.destructiveRow,
      },
    ],
  },
];

const accountStatuses: readonly AccountStatus[] = ['postPurchase', 'signedInDemo', 'signedOutDemo'];

export default function DebugRoute() {
  const router = useRouter();
  const { dispatch } = useDemo();

  const replace = (href: string) => router.replace(href as Href);
  const push = (href: string) => router.push(href as Href);

  const open = (rowId: string) => {
    if (rowId === 'reset-all') {
      Alert.alert(debugContent.resetAlert.title, debugContent.resetAlert.body, [
        { style: 'cancel', text: debugContent.resetAlert.actions[0] },
        {
          onPress: () => {
            dispatch({ type: 'debug/reset' });
            replace('/');
          },
          style: 'destructive',
          text: debugContent.resetAlert.actions[1],
        },
      ]);
      return;
    }

    if (rowId === 'restart-onboarding') {
      dispatch({ type: 'debug/reset' });
      replace('/onboarding/value');
      return;
    }

    if (rowId.startsWith('paywall-')) {
      const fixture = rowId.replace('paywall-', '');
      const plan = fixture === 'monthly' ? 'monthly' : 'annual';
      dispatch({ type: 'paywall/select-plan', plan });
      const overlay = ['purchase', 'loading', 'success', 'failure'].includes(fixture)
        ? `&fixture=${fixture}`
        : '';
      push(`/paywall?plan=${plan}${overlay}`);
      return;
    }

    if (rowId.startsWith('signup-')) {
      const fixture = rowId.replace('signup-', '');
      dispatch({ type: 'debug/set-account', status: 'postPurchase' });
      push(`/signup?mode=postPurchase&fixture=${fixture}`);
      return;
    }

    if (rowId === 'identity-recovery') {
      dispatch({ type: 'debug/set-account', status: 'signedOutDemo' });
      push('/signup?mode=recovery&returnTo=account');
      return;
    }

    if (rowId.startsWith('identity-')) {
      const status = rowId.replace('identity-', '') as AccountStatus;
      if (!accountStatuses.includes(status)) return;
      dispatch({ type: 'debug/set-account', status });
      push(status === 'postPurchase' ? '/signup?mode=postPurchase' : '/settings/account');
      return;
    }

    if (rowId === 'home-empty') {
      dispatch({ type: 'debug/clear-conditions' });
      replace('/(tabs)/home');
      return;
    }

    if (rowId === 'home-showcase') {
      dispatch({ type: 'debug/seed-showcase' });
      replace('/(tabs)/home');
      return;
    }

    const homeFixture = homeModes.find((fixture) => rowId === `home-${fixture.id}`);
    if (homeFixture) {
      dispatch({ type: 'debug/seed-showcase' });
      dispatch({ type: 'home/set-mode', mode: homeFixture.mode });
      replace('/(tabs)/home');
      return;
    }

    const walkFixture = walkFixtures.find((fixture) => rowId === `walk-${fixture.phase}`);
    if (walkFixture) {
      dispatch({ type: 'debug/seed-showcase' });
      dispatch({ type: 'debug/set-walk', phase: walkFixture.phase });
      push('/walk-session?fixture=debug');
      return;
    }

    const gymFixture = gymFixtures.find((fixture) => rowId === `gym-${fixture.phase}`);
    if (gymFixture) {
      dispatch({ type: 'debug/seed-showcase' });
      dispatch({ type: 'debug/set-gym', phase: gymFixture.phase });
      push('/gym-check-in?fixture=debug');
      return;
    }

    if (rowId === 'analysis-empty') {
      dispatch({ type: 'debug/clear-conditions' });
      dispatch({ type: 'debug/set-analysis', history: 'empty' });
      replace('/(tabs)/analysis?fixture=empty');
      return;
    }

    if (rowId === 'analysis-populated' || rowId === 'analysis-new-badge') {
      dispatch({ type: 'debug/seed-showcase' });
      dispatch({
        type: 'debug/set-analysis',
        history: 'populated',
        ...(rowId === 'analysis-new-badge' ? { newBadgeId: 'time-reclaimed-50-hours' } : {}),
      });
      replace(
        rowId === 'analysis-new-badge'
          ? '/analysis/badge/time-reclaimed-50-hours?fixture=new'
          : '/(tabs)/analysis?fixture=populated',
      );
      return;
    }

    if (rowId.startsWith('permission-')) {
      const health = rowId === 'permission-healthy' ? 'healthy' : 'attention';
      dispatch({ type: 'debug/set-permission-health', health });
      push('/settings/permissions');
      return;
    }

    if (rowId.startsWith('subscription-')) {
      const status = rowId.replace('subscription-', '') as 'trial' | 'active' | 'cancelled';
      dispatch({ type: 'debug/set-subscription', status });
      push(`/settings/subscription?fixture=${status}`);
      return;
    }

    for (const triggerFixture of reviewTriggers) {
      for (const stateFixture of reviewStates) {
        if (rowId !== `review-${triggerFixture.trigger}-${stateFixture.slug}`) continue;
        const triggerIndex = reviewTriggers.findIndex((item) => item.trigger === triggerFixture.trigger);
        dispatch({
          type: 'debug/set-review',
          automaticShowCount: stateFixture.prompt === 'dismissed' ? triggerIndex + 1 : triggerIndex,
          automaticSuppressedPermanently: stateFixture.prompt === 'rated',
          prompt: stateFixture.prompt,
          trigger: triggerFixture.trigger,
        });
        push(`/settings/review?fixture=${stateFixture.slug}&trigger=${triggerFixture.trigger}`);
        return;
      }
    }

    if (rowId === 'review-stopped') {
      dispatch({
        type: 'debug/set-review',
        automaticShowCount: 3,
        automaticSuppressedPermanently: false,
        prompt: 'stoppedAfterThree',
        trigger: null,
      });
      push('/settings/review?fixture=stopped');
      return;
    }

    const notificationFixture = notificationFixtures.find((fixture) =>
      rowId === `notification-${fixture.id}-unopened` || rowId === `notification-${fixture.id}-tapped`,
    );
    if (notificationFixture) {
      const phase = rowId.endsWith('-tapped') ? 'tapped' : 'unopened';
      dispatch({ type: 'notification/open-preview', kind: notificationFixture.kind });
      if (phase === 'tapped') dispatch({ type: 'notification/tap' });
      push(`/notification-preview/${notificationFixture.slug}?phase=${phase}`);
      return;
    }

    if (rowId.startsWith('shield-')) {
      push(`/lock-moment/${rowId.replace('shield-', '')}`);
    }
  };

  return (
    <SettingsDetailScreen
      body={debugContent.body}
      onBack={() => replace('/(tabs)/settings')}
      onRowPress={open}
      onToggle={() => undefined}
      prototypeDisclosure="Hidden demo controller · deterministic local state only · no device capability or service is called"
      sections={sections}
      title={debugContent.title}
    />
  );
}
