import { useIsFocused } from 'expo-router';
import { useRuntime } from '../ports/useRuntime';

export function ScreenTimePickerHost() {
  const focused = useIsFocused(), Host = useRuntime().appPickerHost;
  return focused && Host ? <Host /> : null;
}
