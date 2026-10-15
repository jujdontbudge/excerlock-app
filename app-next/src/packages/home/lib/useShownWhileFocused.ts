import { useState } from 'react';
import { useIsFocused } from 'expo-router';
export function useShownWhileFocused(value: number) {
  const focused = useIsFocused();
  const [shown, setShown] = useState(value);
  if (focused && shown !== value) setShown(value);
  return focused ? value : shown;
}
