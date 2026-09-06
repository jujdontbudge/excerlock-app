import { useEffect, useRef } from 'react';
import { useNavigation, useRouter, type Href } from 'expo-router';

import { SettingsScreen, type SettingsScrollHandle } from '@/features/settings';
import { useDemo } from '@/presentation';

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
  const permissionHealth = state.settings.permissionHealth === 'healthy'
    || Object.values(state.onboarding.permissionOutcomes).every((outcome) => outcome === 'allowed')
    ? 'healthy'
    : 'attention';

  useEffect(() => navigation.addListener('tabPress', () => {
    if (navigation.isFocused()) scrollRef.current?.scrollTo({ animated: true, y: 0 });
  }), [navigation]);

  return (
    <SettingsScreen
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
    />
  );
}
