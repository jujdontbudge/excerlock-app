import { View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import Animated from 'react-native-reanimated';
import { Label } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { LivingIcon } from '../../../motion/LivingIcon';
import { useMotion } from '../../../motion/useMotion';
import { Reveal } from '../../../motion/Reveal';
import { habitLoopCopy } from '../../../content/habitLoop';
const stageIcons = [
  ['bell', 'star', 'flame', 'phone'],
  ['bell', 'gym', 'star', 'walking'],
  ['bell', 'gym', 'lock-open', 'check'],
] as const;
/** Four clockwise arcs and one canonical icon per stage. */
export function HabitLoop({ phase }: { phase: number }) {
  const copy = habitLoopCopy[phase],
    m = useMotion();
  const positions = [
    { left: '23%', top: '0%', width: '54%' },
    { left: '68%', top: '38%', width: '32%' },
    { left: '23%', top: '77%', width: '54%' },
    { left: '0%', top: '38%', width: '32%' },
  ] as const;
  return (
    <View style={{ width: '100%', aspectRatio: 360 / 440 }}>
      {[0, 1, 2, 3].map((index) => (
        <Animated.View
          key={index}
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            top: 0,
            animationName: m.reduced
              ? undefined
              : { from: { opacity: 0.65 }, '35%': { opacity: 1 }, to: { opacity: 0.65 } },
            animationDuration: m.duration.breathe,
            animationDelay: index * m.duration.tick,
            animationIterationCount: 'infinite',
            animationTimingFunction: 'ease-in-out',
          }}>
          <Svg width="100%" height="100%" viewBox="0 0 360 440" accessible={false}>
            <G rotation={index * 90} origin="180,220">
              <Path
                d="M240.092 106.982 A128 128 0 0 1 288.55 152.17"
                fill="none"
                stroke={t.brand.primary}
                strokeWidth={t.stroke.chart}
                strokeLinecap="round"
              />
              <G transform="translate(293.018 159.908) rotate(62)">
                <Path d="M0 0 L-12 -6 L-12 6 Z" fill={t.brand.primary} />
              </G>
            </G>
          </Svg>
        </Animated.View>
      ))}
      {copy.stages.map((stage, index) => (
        <View key={index} style={{ position: 'absolute', ...positions[index] }}>
          <Reveal key={stage.title} index={index}>
            <View style={{ gap: t.space.xs }}>
              <LivingIcon name={stageIcons[phase][index]} size={t.space.xxl} tint={t.brand.primary} />
              <Label variant="label" style={{ textAlign: 'center' }}>
                {stage.title}
              </Label>
              <Label variant="support" tone="secondary" style={{ textAlign: 'center' }}>
                {stage.detail}
              </Label>
            </View>
          </Reveal>
        </View>
      ))}
      <View
        style={{ position: 'absolute', left: '33%', top: '45%', width: '34%', alignItems: 'center' }}>
        <Label variant="label" style={{ textAlign: 'center', color: t.brand.primary }}>
          {copy.center}
        </Label>
      </View>
    </View>
  );
}
