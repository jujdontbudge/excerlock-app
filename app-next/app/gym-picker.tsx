import { lazy, Suspense, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { finishPickerSession } from '../src/features/gym-picker/pickerSession';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
const GymPickerScreen = lazy(() =>
  import('../src/features/gym-picker/GymPickerScreen').then((module) => ({ default: module.GymPickerScreen })),
);
export default function GymPickerRoute() {
  const { session, placeId } = useLocalSearchParams<{ session?: string; placeId?: string }>();
  useEffect(() => () => finishPickerSession(session, false), [session]);
  const close = (saved: boolean) => {
    finishPickerSession(session, saved);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <Suspense fallback={null}>
          <GymPickerScreen placeId={placeId} onSaved={() => close(true)} />
        </Suspense>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
