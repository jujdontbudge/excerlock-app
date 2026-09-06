import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
let enabled = true;
export function setHapticsEnabled(value: boolean) {
  enabled = value;
}
export function feedback(kind: 'selection' | 'press' | 'success' | 'error' = 'selection') {
  if (!enabled || process.env.NODE_ENV === 'test' || !Constants.isDevice || Platform.OS === 'web') return;
  const result =
    kind === 'selection'
      ? Haptics.selectionAsync()
      : kind === 'press'
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        : Haptics.notificationAsync(
            kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
          );
  void result.catch(() => undefined);
}
