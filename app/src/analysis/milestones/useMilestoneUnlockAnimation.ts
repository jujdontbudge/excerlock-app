import { useEffect, useMemo } from "react";
import { Animated } from "react-native";

import type { MilestoneId } from "./catalog";

const INITIAL_SCALE = 0.62;
const STAGGER_MS = 120;

/** Owns the one ordered native-driver animation for an Analysis visit. */
export function useMilestoneUnlockAnimation(
  sequence: readonly MilestoneId[],
  enabled: boolean,
): ReadonlyMap<MilestoneId, Animated.Value> {
  const sequenceKey = sequence.join("|");
  const scales = useMemo(
    () =>
      new Map(
        sequence.map((id) => [id, new Animated.Value(INITIAL_SCALE)]),
      ),
    // The ids, rather than the caller's array identity, define a sequence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sequenceKey],
  );

  useEffect(() => {
    if (!enabled || scales.size === 0) return;

    const animation = Animated.stagger(
      STAGGER_MS,
      [...scales.values()].map((scale) =>
        Animated.spring(scale, {
          damping: 13,
          stiffness: 210,
          toValue: 1,
          useNativeDriver: true,
        }),
      ),
    );
    animation.start();

    return () => animation.stop();
  }, [enabled, scales]);

  return scales;
}
