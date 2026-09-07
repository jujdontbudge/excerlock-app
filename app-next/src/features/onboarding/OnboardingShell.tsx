import { opacityIn, opacityOut } from '../../motion/presets';
import { PropsWithChildren, ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { SlideInRight, SlideInLeft, SlideOutLeft, SlideOutRight } from 'react-native-reanimated';
import { ScreenShell, OnboardingHeader, PrimaryButton } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { useMotion } from '../../motion/useMotion';
import { onboardingLabels as c } from '../../content/onboarding';
import { WelcomeFooter } from './welcome/WelcomeFooter';
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
  hideBack = false,
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
  hideBack?: boolean;
}>) {
  const m = useMotion(),
    family = ['W1', 'W2', 'W3', 'G1', 'G2', 'R1', 'R2', 'B1', 'B2', 'D'].includes(step)
      ? 'branch'
      : ['O12', 'O13', 'O14'].includes(step)
        ? 'dots'
        : ['O16', 'O17', 'O18'].includes(step)
          ? 'loop'
          : step;
  const enter = m.reduced
    ? opacityIn(m.duration.standard)
    : (direction === 'forward' ? SlideInRight : SlideInLeft).duration(m.duration.sheet);
  const exit = m.reduced
    ? opacityOut(m.duration.standard)
    : (direction === 'forward' ? SlideOutLeft : SlideOutRight).duration(m.duration.slow);
  return (
    <ScreenShell
      scrollResetKey={step}
      overlay={overlay}
      header={
        ['O01', 'O02', 'O03'].includes(step) ? undefined : (
          <OnboardingHeader progress={progress} onBack={hideBack ? undefined : onBack} />
        )
      }
      footer={
        hideContinue ? undefined : ['O01', 'O02', 'O03'].includes(step) ? (
          <WelcomeFooter onContinue={onContinue} />
        ) : (
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
