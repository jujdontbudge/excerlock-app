import { common } from '../../../content/common';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Heading, LoopDiagram } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { fadeIn, fadeOut, popIn } from '../../../motion/presets';
import { useMotion } from '../../../motion/useMotion';
import { onboardingCopy, onboardingLabels as c } from '../../../content/onboarding';
export function LoopStory({ step }: { step: 'O16' | 'O17' | 'O18' }) {
  const phase = step === 'O16' ? 0 : step === 'O17' ? 1 : 2,
    m = useMotion();
  return (
    <>
      <Animated.View key={step} entering={fadeIn} exiting={fadeOut}>
        <Heading title={onboardingCopy[step].title} support={onboardingCopy[step].body} centered />
      </Animated.View>
      <View style={{ flex: 1, justifyContent: 'center', gap: t.space.xxxl }}>
        {phase > 0 ? (
          <Animated.Image
            source={require('../../../../assets/running-lock.png')}
            accessibilityLabel={common.appName}
            entering={popIn(m.reduced)}
            exiting={fadeOut}
            style={{ height: t.layout.logo, width: t.layout.logo, alignSelf: 'center' }}
          />
        ) : null}
        <LoopDiagram
          phase={phase}
          labels={c.loopLabels[phase]}
          icons={phase === 0 ? ['bell', 'lock-open', 'clock'] : ['bell', 'walking', 'lock-open']}
        />
      </View>
    </>
  );
}
