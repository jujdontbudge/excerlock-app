import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Label } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { LivingIcon } from '../../../motion/LivingIcon';
import { opacityIn, opacityOut } from '../../../motion/presets';
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
  { x: 180, y: 72, width: 160 },
  { x: 304, y: 246, width: 112 },
  { x: 180, y: 424, width: 160 },
  { x: 56, y: 246, width: 112 },
];
const expanded = [
  { x: 180, y: 52, width: 160 },
  { x: 304, y: 342, width: 112 },
  { x: 56, y: 342, width: 112 },
  { x: 56, y: 158, width: 112 },
];
const inserted = [
  { ...loopIntervention.lock, x: 304, y: 158, width: 112 },
  { ...loopIntervention.runner, x: 180, y: 448, width: 160 },
];

/** Keep semantic nodes mounted while geometry moves, then crossfade their meaning. */
export function HabitLoop({ phase, contentPhase = phase }: { phase: number; contentPhase?: number }) {
  const m = useMotion(),
    changed = phase === 1,
    copy = habitLoopCopy[contentPhase],
    positions = changed ? expanded : original;
  return (
    <View testID="habit-loop-canvas" style={{ width: '100%', aspectRatio: 360 / 500 }}>
      <LoopArrows expanded={changed} />
      {copy.stages.map((stage, index) => {
        const anchor = positions[index];
        return (
          <Animated.View
            key={index}
            testID={`loop-stage-${index}`}
            style={{
              position: 'absolute',
              left: `${(anchor.x / 360) * 100}%`,
              top: `${(anchor.y / 500) * 100}%`,
              width: anchor.width,
              height: 100,
              marginLeft: -anchor.width / 2,
              marginTop: -50,
              alignItems: 'center',
              justifyContent: 'center',
              transitionProperty: ['left', 'top', 'width', 'marginLeft'],
              transitionDelay: m.reduced ? 0 : m.duration.press,
              transitionDuration: m.reduced ? 0 : m.duration.planCheck,
              transitionTimingFunction: 'ease-in-out',
            }}>
            <Animated.View
              key={`${contentPhase}-${stage.title}`}
              entering={opacityIn(m.duration.standard)}
              exiting={opacityOut(m.duration.fast)}
              style={{ alignItems: 'center', gap: t.space.xs }}>
              <LivingIcon name={icons[contentPhase][index]} size={t.space.xxl} tint={t.brand.primary} />
              <Label variant="label" style={{ textAlign: 'center' }}>
                {stage.title}
              </Label>
              <Label variant="support" tone="secondary" style={{ textAlign: 'center' }}>
                {stage.detail}
              </Label>
            </Animated.View>
          </Animated.View>
        );
      })}
      {changed &&
        inserted.map((stage, index) => (
          <Animated.View
            key={stage.title}
            exiting={opacityOut(m.duration.fast)}
            style={{
              position: 'absolute',
              left: `${(stage.x / 360) * 100}%`,
              top: `${(stage.y / 500) * 100}%`,
              width: stage.width,
              height: 100,
              marginLeft: -stage.width / 2,
              marginTop: -50,
              alignItems: 'center',
              justifyContent: 'center',
              gap: t.space.xs,
              animationName: m.reduced
                ? undefined
                : index === 0
                  ? {
                      from: { opacity: 0, transform: [{ translateX: t.space.xl }] },
                      '82%': { opacity: 1, transform: [{ translateX: -t.space.xs }] },
                      to: { opacity: 1, transform: [{ translateX: 0 }] },
                    }
                  : {
                      from: { opacity: 0, transform: [{ translateY: t.space.xl }] },
                      '82%': { opacity: 1, transform: [{ translateY: -t.space.xs }] },
                      to: { opacity: 1, transform: [{ translateY: 0 }] },
                    },
              animationDuration: m.duration.slow,
              animationDelay: index === 0 ? m.duration.standard : m.duration.standard * 2,
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
      <View
        style={{
          position: 'absolute',
          left: '29%',
          top: '42%',
          width: '42%',
          height: 80,
          justifyContent: 'center',
        }}>
        <Animated.View
          key={copy.center}
          entering={opacityIn(m.duration.standard)}
          exiting={opacityOut(m.duration.fast)}>
          <Label variant="label" style={{ textAlign: 'center', color: t.brand.primary }}>
            {copy.center}
          </Label>
        </Animated.View>
      </View>
    </View>
  );
}
