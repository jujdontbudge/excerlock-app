import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Heading } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { opacityIn, opacityOut } from '../../../motion/presets';
import { useMotion } from '../../../motion/useMotion';
import { onboardingCopy } from '../../../content/onboarding';
import { HabitLoop } from './HabitLoop';

const steps = ['O16', 'O17', 'O18'] as const;
export function LoopStory({ step }: { step: (typeof steps)[number] }) {
  const phase = steps.indexOf(step),
    m = useMotion(),
    contentPhase = useDelayedPhase(phase, m.reduced),
    visibleStep = steps[contentPhase];
  return (
    <>
      <View style={{ minHeight: 88 }}>
        <Animated.View
          key={visibleStep}
          entering={opacityIn(m.duration.standard)}
          exiting={opacityOut(m.duration.fast)}>
          <Heading title={onboardingCopy[visibleStep].title} support={onboardingCopy[visibleStep].body} centered />
        </Animated.View>
      </View>
      <View style={{ flex: 1, justifyContent: 'center', gap: t.space.xl }}>
        <HabitLoop phase={phase} contentPhase={contentPhase} />
      </View>
    </>
  );
}

function useDelayedPhase(phase: number, reduced: boolean) {
  const [visible, setVisible] = useState(phase);
  useEffect(() => {
    if (reduced) return;
    const timeout = setTimeout(() => setVisible(phase), t.motion.duration.reveal);
    return () => clearTimeout(timeout);
  }, [phase, reduced]);
  return reduced ? phase : visible;
}
