import { ReactNode, useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { tokens as t } from '../../ui/tokens';
import { useMotion } from '../../ui/useMotion';
import { PageDirection, shouldTurnPage } from './periodSwipe';

export function PeriodPager({ canNext, onPage, children }: {
  canNext: boolean;
  onPage: (direction: PageDirection) => void;
  children: (page: (direction: PageDirection) => void) => ReactNode;
}) {
  const motion = useMotion();
  const { timing, spring } = motion;
  const travel = useSharedValue(0);
  const dragX = useSharedValue(0);
  const [entrance, setEntrance] = useState<{ direction: PageDirection } | null>(null);
  const commit = useCallback((direction: PageDirection) => {
    setEntrance({ direction });
    onPage(direction);
  }, [onPage]);
  useLayoutEffect(() => {
    if (!entrance) return;
    dragX.set(motion.sequence(
      motion.timing(entrance.direction * travel.get(), 'press', { stretch: 0 }),
      motion.timing(0, 'standard', { curve: 'enter' }),
    ));
  }, [entrance, dragX, travel, motion]);
  const page = useCallback((direction: PageDirection) => {
    if (direction === 1 && !canNext) return;
    if (motion.reduced) {
      commit(direction);
      return;
    }
    dragX.set(timing(-direction * travel.get(), 'press', {
      done: (finished) => {
        'worklet';
        if (finished) scheduleOnRN(commit, direction);
      },
    }));
  }, [canNext, commit, dragX, motion.reduced, timing, travel]);
  const swipe = useMemo(() => Gesture.Pan()
    .activeOffsetX([-t.space.md, t.space.md])
    .failOffsetY([-t.space.md, t.space.md])
    .onUpdate((event) => {
      dragX.set(event.translationX < 0 && !canNext ? event.translationX / 4 : event.translationX);
    })
    .onEnd((event) => {
      const direction: PageDirection = event.translationX > 0 ? -1 : 1;
      if (shouldTurnPage(event.translationX, event.velocityX, travel.get()) && (direction === -1 || canNext)) {
        dragX.set(timing(-direction * travel.get(), 'press', {
          done: (finished) => {
            'worklet';
            if (finished) scheduleOnRN(commit, direction);
          },
        }));
        return;
      }
      dragX.set(spring(0, 'control'));
    }), [canNext, commit, dragX, spring, timing, travel]);
  const slide = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(dragX.get()), [0, Math.max(1, travel.get())], [1, 0.4]),
    transform: [{ translateX: dragX.get() }],
  }));
  return (
    <GestureDetector gesture={swipe}>
      <Animated.View
        testID="Analytics period swipe"
        onLayout={(event) => travel.set(event.nativeEvent.layout.width + t.layout.page)}
        style={[s.pager, slide]}>
        {children(page)}
      </Animated.View>
    </GestureDetector>
  );
}

const s = StyleSheet.create({
  pager: { gap: t.space.lg },
});
