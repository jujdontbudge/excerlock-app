import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Label } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { LivingIcon } from '../../../motion/LivingIcon';
import { useMotion } from '../../../motion/useMotion';
import { habitLoopCopy } from '../../../content/habitLoop';
import { loopIntervention } from '../../../content/loopIntervention';
import { LoopArrows } from './LoopArrows';
import { LoopBrandMark } from './LoopBrandMark';
const icons = [
  ['bell', 'star', 'flame', 'phone'],
  ['bell', 'star', 'flame', 'running'],
  ['bell', 'gym', 'lock-open', 'check'],
] as const;
const original = [
  [23, 0, 54],
  [68, 38, 32],
  [23, 77, 54],
  [0, 38, 32],
];
const expanded = [
  [23, 0, 54],
  [68, 58, 32],
  [0, 58, 32],
  [0, 20, 32],
];
/** Keep the original four nodes mounted while the intervention slides into their loop. */
export function HabitLoop({ phase }: { phase: number }) {
  const m = useMotion(),
    changed = phase === 1,
    copy = habitLoopCopy[phase];
  const positions = changed ? expanded : original;
  return (
    <View style={{ width: '100%', aspectRatio: 360 / 440 }}>
      <LoopArrows expanded={changed} />
      {copy.stages.map((stage, index) => (
        <Animated.View
          key={index}
          testID={`loop-stage-${index}`}
          style={{
            position: 'absolute',
            left: `${positions[index][0]}%`,
            top: `${positions[index][1]}%`,
            width: `${positions[index][2]}%`,
            gap: t.space.xs,
            transitionProperty: ['left', 'top', 'width'],
            transitionDuration: m.reduced ? 0 : m.duration.reveal,
            transitionTimingFunction: 'ease-in-out',
          }}>
          <LivingIcon name={icons[phase][index]} size={t.space.xxl} tint={t.brand.primary} />
          <Label variant="label" style={{ textAlign: 'center' }}>
            {stage.title}
          </Label>
          <Label variant="support" tone="secondary" style={{ textAlign: 'center' }}>
            {stage.detail}
          </Label>
        </Animated.View>
      ))}
      {changed &&
        [loopIntervention.lock, loopIntervention.runner].map((stage, index) => (
          <Animated.View
            key={stage.title}
            style={{
              position: 'absolute',
              left: index === 0 ? '68%' : '32%',
              top: index === 0 ? '20%' : '81%',
              width: index === 0 ? '32%' : '36%',
              alignItems: 'center',
              gap: t.space.xs,
              animationName: m.reduced
                ? undefined
                : {
                    from: { opacity: 0, transform: [{ translateX: t.space.xxxl }] },
                    to: { opacity: 1, transform: [{ translateX: 0 }] },
                  },
              animationDuration: m.duration.sheet,
              animationDelay: m.duration.standard + index * m.duration.slow,
              animationFillMode: 'backwards',
              animationTimingFunction: 'ease-out',
            }}>
            {index === 0 ? <LoopBrandMark /> : <LivingIcon name="running" size={t.space.xxl} tint={t.brand.primary} />}
            <Label variant="label" style={{ textAlign: 'center' }}>
              {stage.title}
            </Label>
            <Label variant="support" tone="secondary" style={{ textAlign: 'center' }}>
              {stage.detail}
            </Label>
          </Animated.View>
        ))}
      <View style={{ position: 'absolute', left: '30%', top: '45%', width: '40%' }}>
        <Animated.View
          key={copy.center}
          style={{
            animationName: m.reduced ? undefined : { from: { opacity: 0 }, to: { opacity: 1 } },
            animationDuration: m.duration.standard,
            animationDelay: changed ? m.duration.tick : 0,
            animationFillMode: 'backwards',
          }}>
          <Label variant="label" style={{ textAlign: 'center', color: t.brand.primary }}>
            {copy.center}
          </Label>
        </Animated.View>
      </View>
    </View>
  );
}
