import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Label } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { Reveal } from '../../../motion/Reveal';
import { useMotion } from '../../../motion/useMotion';
import { finalLoopTitle, loopSubheads, onboardingCopy } from '../../../content/onboarding';
import { HabitLoop } from './HabitLoop';

const steps = ['O16', 'O17', 'O18'] as const;
/** Two heading lines at default type; measurement takes over once the real headings report in. */
const minHeadingHeight = 76;
export function LoopStory({ step }: { step: (typeof steps)[number] }) {
  const phase = steps.indexOf(step),
    m = useMotion(),
    contentPhase = useDelayedPhase(phase, m.reduced),
    [box, setBox] = useState({ width: 0, height: 0 }),
    [headings, setHeadings] = useState<Partial<Record<(typeof steps)[number], number>>>({}),
    // The heading box reserves only what the tallest of the three crossfading headings actually needs.
    headingHeight = Math.max(minHeadingHeight, ...Object.values(headings).map((v) => v ?? 0)),
    // Fit the diagram to the shorter of the two axes so it centres whole instead of overflowing the button.
    canvasWidth = box.width && box.height ? Math.min(box.width, (box.height * 360) / 500) : undefined;
  return (
    <>
      <View style={{ minHeight: headingHeight, position: 'relative' }}>
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
      {/* The diagram is sized to the space left under the heading so it centres instead of overflowing the button. */}
      <View
        style={{ flex: 1, justifyContent: 'center' }}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setBox((current) => (current.width === width && current.height === height ? current : { width, height }));
        }}>
        <HabitLoop phase={phase} contentPhase={contentPhase} width={canvasWidth} />
      </View>
    </>
  );
}

/** The loop screens carry a heading-sized subhead whose first word is orange. */
function LoopHeading({ step }: { step: 'O16' | 'O17' }) {
  const sub = loopSubheads[step],
    subhead = `${sub.before}${sub.emphasis}${sub.after}`;
  return (
    <Reveal>
      <View style={{ gap: t.space.md }}>
        <Label accessibilityRole="header" variant="question" style={{ textAlign: 'center' }}>
          {onboardingCopy[step].title}
        </Label>
        <Label accessibilityLabel={subhead} variant="question" style={{ textAlign: 'center' }}>
          {sub.before}
          <Label variant="question" style={{ color: t.brand.primary }}>
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
        variant="question"
        style={{ textAlign: 'center' }}>
        {finalLoopTitle.before}
        <Label variant="question" style={{ color: t.brand.primary }}>
          {finalLoopTitle.emphasis}
        </Label>
        {finalLoopTitle.after}
      </Label>
    </Reveal>
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
