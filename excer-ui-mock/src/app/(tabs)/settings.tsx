import { useEffect, useRef } from 'react';
import { useNavigation, useRouter, type Href } from 'expo-router';

import { getSubscriptionPresentation } from '@/content';
import { SettingsScreen, type SettingsScrollHandle } from '@/features/settings';
import { useDemo } from '@/presentation';

const appearanceLabels = { auto: 'Auto', light: 'Light', dark: 'Dark' } as const;
const unitLabels = { miles: 'Miles', kilometers: 'Kilometers' } as const;

type SettingsTabNavigation = {
  addListener: (event: 'tabPress', listener: () => void) => () => void;
  isFocused: () => boolean;
};

export default function SettingsRoute() {
  const router = useRouter();
  const navigation = useNavigation() as unknown as SettingsTabNavigation;
  const footerTaps = useRef(0);
  const scrollRef = useRef<SettingsScrollHandle>(null);
  const { state } = useDemo();
  const subscription = getSubscriptionPresentation(
    state.settings.subscriptionStatus,
    state.selectedPlan,
    state.settings.subscriptionOffer,
  );
  const permissionHealth = state.settings.permissionHealth === 'healthy'
    || Object.values(state.onboarding.permissionOutcomes).every((outcome) => outcome === 'allowed')
    ? 'healthy'
    : 'attention';

  useEffect(() => navigation.addListener('tabPress', () => {
    if (navigation.isFocused()) scrollRef.current?.scrollTo({ animated: true, y: 0 });
  }), [navigation]);

  return (
    <SettingsScreen
      accountSignedIn={state.account.status === 'signedInDemo'}
      onFooterTap={() => {
        footerTaps.current += 1;
        if (footerTaps.current >= 7) {
          footerTaps.current = 0;
          router.push('/debug');
        }
      }}
      onOpenPermissions={() => router.push('/settings/permissions')}
      onOpenRow={(_rowId, route) => router.push(route as Href)}
      permissionHealth={permissionHealth}
      scrollRef={scrollRef}
      summaryOverrides={{
        connections: `${state.settings.healthConnected ? 'Apple Health demo' : 'Health needs attention'} · ${Object.values(state.settings.shortcuts).filter(Boolean).length} shortcut${Object.values(state.settings.shortcuts).filter(Boolean).length === 1 ? '' : 's'} added`,
        general: `${appearanceLabels[state.settings.appearance]} appearance · ${unitLabels[state.settings.units]} · ${state.settings.dayBoundary === 'midnight' ? 'Midnight' : state.settings.dayBoundary}`,
        notifications: Object.values(state.settings.notificationChoices).filter(Boolean).length === 0
          ? 'All off'
          : `${Object.values(state.settings.notificationChoices).filter(Boolean).length} enabled`,
        subscription: `${subscription.status} · ${subscription.accessThrough}`,
      }}
    />
  );
}
