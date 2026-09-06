import { useEffect, useState } from 'react';
import { Keyboard, KeyboardEvent, Platform } from 'react-native';
import { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { tokens as t } from '../design-system/tokens';
import { useMotion } from './useMotion';

/** Absolute sheets must resize their scroll area as well as lift their footer. */
export function useSheetKeyboard(height: number) {
  const [inset, setInset] = useState(0),
    motion = useMotion();
  useEffect(() => {
    const update = (event: KeyboardEvent) => {
      setInset(Math.max(0, height - event.endCoordinates.screenY));
    };
    const hide = () => setInset(0);
    const change = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow', update);
    const dismiss = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', hide);
    return () => {
      change.remove();
      dismiss.remove();
      Keyboard.dismiss();
    };
  }, [height]);
  return useAnimatedStyle(() => ({
    bottom: withTiming(inset, { duration: motion.duration.sheet }),
    maxHeight: withTiming((height - inset) * t.layout.sheetMax, { duration: motion.duration.sheet }),
  }));
}
