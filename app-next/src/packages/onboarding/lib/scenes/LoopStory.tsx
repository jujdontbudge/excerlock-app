import { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Label } from '../../../ui';
import { tokens as t } from '../../../ui/tokens';
import { Reveal } from '../../../ui/Reveal';
import { useMotion } from '../../../ui/useMotion';
import { useHapticCue } from '../../../ui/haptics';
import { finalLoopTitle, loopSubheads, onboardingCopy } from '../onboardingCopy';
import { LOOP_SCENE, LoopScene } from './LoopScene';
import { Cast } from '../condition-demo/Character';

const steps = ['O16', 'O17', 'O18'] as const;
const minHeadingHeight = 76;
export function LoopStory({ step, cast }: { step: (typeof steps)[number]; cast: Cast }) {
  const phase = steps.indexOf(step),
    m = useMotion(),
    [box, setBox] = useState({ width: 0, height: 0 }),
    [headings, setHeadings] = useState<Partial<Record<(typeof steps)[number], number>>>({}),
    headingHeight = Math.max(minHeadingHeight, ...Object.values(headings).map((v) => v ?? 0)),
    canvasWidth = box.width && box.height ? Math.min(box.width, (box.height * LOOP_SCENE.width) / LOOP_SCENE.height) : 0;
  useHapticCue(
    step === 'O17' ? 'lock' : step === 'O18' ? 'success' : 'none',
    m.reduced ? m.duration.standard : m.duration.emphasized,
    step,
  );
  return (
    <>
      <View style={{ minHeight: headingHeight, position: 'relative' }}>
        {steps.map((candidate, candidatePhase) => (
          <Animated.View
            key={candidate}
            testID={`loop-heading-${candidate}`}
            pointerEvents="none"
            accessibilityElementsHidden={phase !== candidatePhase}
            importantForAccessibility={phase === candidatePhase ? 'auto' : 'no-hide-descendants'}
            style={{
              position: 'absolute',
              width: '100%',
              opacity: phase === candidatePhase ? 1 : 0,
              ...m.transition('opacity', 'emphasized'),
            }}>
            <View
              onLayout={(e) => {
                const measured = e.nativeEvent.layout.height;
                setHeadings((current) =>
                  current[candidate] === measured ? current : { ...current, [candidate]: measured },
                );
              }}>
              {candidate === 'O18' ? <FinalLoopHeading /> : <LoopHeading step={candidate} />}
            </View>
          </Animated.View>
        ))}
      </View>
      <View
        testID="loop-scene-box"
        style={{ flex: 1, justifyContent: 'center' }}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setBox((current) => (current.width === width && current.height === height ? current : { width, height }));
        }}>
        {canvasWidth > 0 ? <LoopScene phase={phase} width={canvasWidth} cast={cast} /> : null}
      </View>
    </>
  );
}

function LoopHeading({ step }: { step: 'O16' | 'O17' }) {
  const sub = loopSubheads[step],
    subhead = `${sub.before}${sub.emphasis}${sub.after}`;
  return (
    <Reveal>
      <View style={{ gap: t.space.md }}>
        <Label accessibilityRole="header" variant="display" style={{ textAlign: 'center' }}>
          {onboardingCopy[step].title}
        </Label>
        <Label accessibilityLabel={subhead} variant="display" style={{ textAlign: 'center' }}>
          {sub.before}
          <Label variant="display" style={{ color: t.brand.primary }}>
            {sub.emphasis}
          </Label>
          {sub.after}
        </Label>
      </View>
    </Reveal>
  );
}
function FinalLoopHeading() {
  return (
    <Reveal>
      <Label
        accessibilityLabel={onboardingCopy.O18.title}
        accessibilityRole="header"
        variant="display"
        style={{ textAlign: 'center' }}>
        {finalLoopTitle.before}
        <Label variant="display" style={{ color: t.brand.primary }}>
          {finalLoopTitle.emphasis}
        </Label>
        {finalLoopTitle.after}
      </Label>
    </Reveal>
  );
}

