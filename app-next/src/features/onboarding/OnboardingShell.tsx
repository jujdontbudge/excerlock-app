import { PropsWithChildren, ReactNode } from 'react';
import { View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideInLeft,
  SlideOutLeft,
  SlideOutRight,
} from 'react-native-reanimated';
import { ScreenShell, OnboardingHeader, PrimaryButton } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { useMotion } from '../../motion/useMotion';
import { onboardingLabels as c } from '../../content/onboarding';
export function OnboardingShell({
  children,
  step,
  progress,
  direction,
  onBack,
  onContinue,
  valid = true,
  overlay,
  continueLabel,
  hideContinue = false,
}: PropsWithChildren<{
  step: string;
  progress: number;
  direction: 'forward' | 'back';
  onBack: () => void;
  onContinue: () => void;
  valid?: boolean;
  overlay?: ReactNode;
  continueLabel?: string;
  hideContinue?: boolean;
}>) {
  const m = useMotion(),
    family = ['O12', 'O13', 'O14'].includes(step) ? 'dots' : ['O16', 'O17', 'O18'].includes(step) ? 'loop' : step;
  const enter = m.reduced
    ? FadeIn.duration(m.duration.standard)
    : (direction === 'forward' ? SlideInRight : SlideInLeft).duration(m.duration.sheet);
  const exit = m.reduced
    ? FadeOut.duration(m.duration.standard)
    : (direction === 'forward' ? SlideOutLeft : SlideOutRight).duration(m.duration.slow);
  return (
    <ScreenShell
      overlay={overlay}
      header={<OnboardingHeader progress={progress} onBack={step === 'O01' ? undefined : onBack} />}
      footer={
        hideContinue ? undefined : (
          <PrimaryButton
            label={continueLabel ?? (step === 'O01' ? c.start : c.continue)}
            onPress={onContinue}
            disabled={!valid}
          />
        )
      }>
      <View style={{ flexGrow: 1 }}>
        <Animated.View key={family} entering={enter} exiting={exit} style={{ flexGrow: 1, gap: t.space.xl }}>
          {children}
        </Animated.View>
      </View>
    </ScreenShell>
  );
}
