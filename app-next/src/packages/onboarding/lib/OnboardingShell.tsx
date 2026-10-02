import { pageIn, pageOut } from '../../ui/presets';
import { PropsWithChildren, ReactNode, useLayoutEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { ScreenShell, OnboardingHeader, PrimaryButton } from '../../ui';
import { tokens as t } from '../../ui/tokens';
import { useMotion } from '../../ui/useMotion';
import { onboardingLabels as c } from './onboardingCopy';
import { WelcomeFooter } from './welcome/WelcomeFooter';
import { SetupPresentation } from '../../ui/SetupPresentation';
import { Reveal } from '../../ui/Reveal';
import { shouldCoverOtaDestination, useOtaCover } from '../../updates/updates';
export function OnboardingShell({
  children,
  step,
  progress,
  direction,
  onBack,
  onContinue,
  onTransitionStarted,
  onTransitionSettled,
  valid = true,
  overlay,
  continueLabel,
  hideContinue = false,
  hideBack = false,
  continuing = false,
}: PropsWithChildren<{
  step: string;
  progress: number;
  direction: 'forward' | 'back';
  onBack: () => void;
  onContinue: () => void;
  onTransitionStarted: (step: string) => void;
  onTransitionSettled: (step: string) => void;
  valid?: boolean;
  overlay?: ReactNode;
  continueLabel?: string;
  hideContinue?: boolean;
  hideBack?: boolean;
  continuing?: boolean;
}>) {
  const m = useMotion(),
    family = ['W1', 'W2', 'W3', 'G1', 'G2', 'R1', 'R2', 'B1', 'B2', 'D'].includes(step)
      ? 'branch'
      : ['O12', 'O13', 'O14'].includes(step)
        ? 'dots'
        : ['O16', 'O17', 'O18'].includes(step)
          ? 'loop'
          : step;
  const previousFamily = useRef<string | null>(null);
  const covered = useOtaCover();
  const skipEntry = covered && shouldCoverOtaDestination();
  useLayoutEffect(() => {
    if (previousFamily.current !== family && !skipEntry) onTransitionStarted(step);
    previousFamily.current = family;
  }, [family, step, onTransitionStarted, skipEntry]);
  const enter = pageIn(m.reduced, direction).withCallback((finished) => {
    'worklet';
    if (finished) scheduleOnRN(onTransitionSettled, step);
  });
  const exit = pageOut(m.reduced, direction);
  return (
    <SetupPresentation>
      <ScreenShell
        scrollResetKey={step}
        fullBleed={step === 'S3b'}
        overlay={overlay}
        contentStyle={step === 'S3b'
          ? { paddingHorizontal: 0, paddingBottom: 0 }
          : undefined}
        header={
          ['S2', 'S3', 'S3b', 'S3c'].includes(step) ? undefined : ['O01', 'O02', 'O03', 'S3d'].includes(step) ? (
            <OnboardingHeader progress={0} showProgress={false} onBack={step === 'O01' ? undefined : onBack} />
          ) : (
            <OnboardingHeader progress={progress} onBack={hideBack ? undefined : onBack} />
          )
        }
        footer={
          hideContinue ? (
            ['O11', 'O12', 'O13', 'O14'].includes(step) ? (
              <View style={{ height: t.control.full }} />
            ) : undefined
          ) : ['O01', 'O02', 'O03'].includes(step) ? (
            <WelcomeFooter onContinue={onContinue} />
          ) : (
            <Reveal key={['O11', 'O12', 'O13', 'O14'].includes(step) ? step : 'continue'}>
              <PrimaryButton
                shape={['O04', 'O05', 'O06'].includes(step) ? 'rounded' : 'pill'}
                label={continueLabel ?? (step === 'O01' ? c.start : c.continue)}
                onPress={onContinue}
                disabled={!valid}
                loading={continuing}
              />
            </Reveal>
          )
        }>
        <View style={{ flexGrow: 1 }}>
          <Animated.View key={family} entering={skipEntry ? undefined : enter} exiting={exit} style={{ flexGrow: 1, gap: t.space.xl }}>
            {children}
          </Animated.View>
        </View>
      </ScreenShell>
    </SetupPresentation>
  );
}
