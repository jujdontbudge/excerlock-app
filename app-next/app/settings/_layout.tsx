import { Stack } from 'expo-router';
import { useMotion } from '../../src/packages/ui/useMotion';
export default function SettingsLayout() {
  const m = useMotion();
  return <Stack screenOptions={{ headerShown: false, animation: m.reduced ? 'fade' : 'slide_from_right' }} />;
}
