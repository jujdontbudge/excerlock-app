import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Heading } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { fadeIn, fadeOut } from '../../../motion/presets';
import { onboardingCopy } from '../../../content/onboarding';
import { HabitLoop } from './HabitLoop';
import { ChangedHabitLoop } from './ChangedHabitLoop';
export function LoopStory({ step }: { step: 'O16' | 'O17' | 'O18' }) {
  const phase = step === 'O16' ? 0 : step === 'O17' ? 1 : 2;
  return (
    <>
      <Animated.View key={step} entering={fadeIn} exiting={fadeOut}>
        <Heading title={onboardingCopy[step].title} support={onboardingCopy[step].body} centered />
      </Animated.View>
      <View style={{ flex: 1, justifyContent: 'center', gap: t.space.xxxl }}>
        {phase === 1 ? <ChangedHabitLoop /> : <HabitLoop phase={phase} />}
      </View>
    </>
  );
}
