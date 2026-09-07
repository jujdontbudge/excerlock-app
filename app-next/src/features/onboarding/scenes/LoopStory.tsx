import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Heading } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { useMotion } from '../../../motion/useMotion';
import { onboardingCopy } from '../../../content/onboarding';
import { HabitLoop } from './HabitLoop';

const steps = ['O16', 'O17', 'O18'] as const;
export function LoopStory({ step }: { step: (typeof steps)[number] }) {
  const phase = steps.indexOf(step),
    m = useMotion(),
    contentPhase = useDelayedPhase(phase, m.reduced);
  return (
    <>
      <View style={{ minHeight: 88, position: 'relative' }}>
        {steps.map((candidate, candidatePhase) => (
          <Animated.View
            key={candidate}
            testID={`loop-heading-${candidate}`}
            pointerEvents="none"
            accessibilityElementsHidden={contentPhase !== candidatePhase}
            importantForAccessibility={contentPhase === candidatePhase ? 'auto' : 'no-hide-descendants'}
            style={{
              position: 'absolute',
              width: '100%',
              opacity: contentPhase === candidatePhase ? 1 : 0,
              transitionProperty: 'opacity',
              transitionDuration: m.reduced ? 0 : m.duration.slow,
              transitionTimingFunction: 'ease-in-out',
            }}>
            <Heading title={onboardingCopy[candidate].title} support={onboardingCopy[candidate].body} centered />
          </Animated.View>
        ))}
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
    const timeout = setTimeout(() => setVisible(phase), t.motion.duration.press);
    return () => clearTimeout(timeout);
  }, [phase, reduced]);
  return reduced ? phase : visible;
}
