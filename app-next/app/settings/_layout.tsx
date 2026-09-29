import { Stack } from 'expo-router';
import { useMotion } from '../../src/packages/ui/useMotion';
import { useDevProtectedRouteMount } from '../../src/packages/launch/DevProtectedRouteMount';
export default function SettingsLayout() {
  useDevProtectedRouteMount();
  const m = useMotion();
  return <Stack screenOptions={{ headerShown: false, animation: m.reduced ? 'fade' : 'slide_from_right' }} />;
}
