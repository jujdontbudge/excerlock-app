import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Label } from '../../ui/Label';
import { scheduleHaptic } from '../../ui/haptics';
import { useMotion } from '../../ui/useMotion';
import { HotWord } from './HotWord';
import { paywallCopy as copy } from './paywallCopy';

export const headlineLook = { from: 0.55, landing: 260, glow: 9 } as const;

export function PaywallHeadline() {
  const m = useMotion(),
    pop = useSharedValue(m.reduced ? 1 : headlineLook.from),
    shown = useSharedValue(m.reduced ? 1 : 0);
  useEffect(() => {
    if (m.reduced) return;
    pop.value = m.delay(headlineLook.landing, m.spring(1, 'pop'));
    shown.value = m.delay(headlineLook.landing, m.timing(1, 'standard'));
    const cancel = scheduleHaptic('detent', headlineLook.landing);
    return () => {
      cancel();
      [pop, shown].forEach((value) => cancelAnimation(value));
    };
  }, [m, pop, shown]);
  const word = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ scale: pop.value }] }));
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={copy.title} style={{ alignItems: 'center' }}>
      <Label variant="display" accessible={false} style={{ textAlign: 'center' }}>
        {copy.lead}
      </Label>
      <Animated.View style={[{ alignSelf: 'center' }, word]}>
        <HotWord text={copy.hot} variant="hero" glow={headlineLook.glow} shineDelay={headlineLook.landing * 3} />
      </Animated.View>
      <Label variant="display" accessible={false} style={{ textAlign: 'center' }}>
        {copy.tail}
      </Label>
    </View>
  );
}
