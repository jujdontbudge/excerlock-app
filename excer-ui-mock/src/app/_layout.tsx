import { useEffect } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/design-system';
import { DemoProvider, useDemo } from '@/presentation';

function AutomaticReviewNavigator() {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useDemo();

  useEffect(() => {
    if (
      state.review.prompt === 'presented'
      && state.review.promptOrigin === 'automatic'
      && pathname !== '/settings/review'
    ) {
      router.push('/settings/review?source=automatic');
    }
  }, [pathname, router, state.review.prompt, state.review.promptOrigin]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DemoProvider>
          <AutomaticReviewNavigator />
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              animation: 'fade',
              contentStyle: { backgroundColor: colors.canvas.contentTop },
              headerShown: false,
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding/[step]" />
            <Stack.Screen name="paywall" options={{ gestureEnabled: false }} />
            <Stack.Screen name="signup" options={{ presentation: 'modal' }} />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen name="condition-builder" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.92] }} />
            <Stack.Screen name="share-achievement" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.72] }} />
          </Stack>
        </DemoProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
