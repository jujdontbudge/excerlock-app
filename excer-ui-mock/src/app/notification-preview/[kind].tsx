import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import type { NotificationPreviewSlug } from '@/content';
import { NotificationPreviewScreen } from '@/features/notification-entry';
import { useDemo, type NotificationKind } from '@/presentation';

const slugs: NotificationPreviewSlug[] = ['nudge', 'recap', 'last-call'];
const stateKinds: Record<NotificationPreviewSlug, NotificationKind> = {
  nudge: 'afternoonNudge',
  recap: 'weeklyRecap',
  'last-call': 'streakLastCall',
};

export default function NotificationPreviewRoute() {
  const { kind, phase } = useLocalSearchParams<{ kind?: string; phase?: string }>();
  const router = useRouter();
  const { state, dispatch } = useDemo();
  const slug = slugs.includes(kind as NotificationPreviewSlug) ? kind as NotificationPreviewSlug : 'nudge';

  useEffect(() => {
    if (state.notification.kind !== stateKinds[slug]) {
      dispatch({ type: 'notification/open-preview', kind: stateKinds[slug] });
    }
  }, [dispatch, slug, state.notification.kind]);

  return (
    <NotificationPreviewScreen
      onDismiss={() => {
        dispatch({ type: 'notification/dismiss' });
        router.replace('/debug');
      }}
      onEnterDestination={(target) => {
        dispatch({ type: 'notification/tap' });
        if (target === 'recap') router.replace('/(tabs)/analysis?entry=recap');
        else if (target === 'last-call') router.replace('/(tabs)/home?entry=lastCall');
        else router.replace('/(tabs)/home?entry=nudge');
      }}
      phase={phase === 'tapped' ? 'tapped' : 'unopened'}
      slug={slug}
    />
  );
}
