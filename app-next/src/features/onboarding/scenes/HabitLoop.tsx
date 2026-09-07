import { View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import Animated from 'react-native-reanimated';
import { Label } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { LivingIcon } from '../../../motion/LivingIcon';
import { useMotion } from '../../../motion/useMotion';
import { Reveal } from '../../../motion/Reveal';
import { habitLoopCopy } from '../../../content/habitLoop';
/** Four clockwise arcs, independent labels, and one shared phone/fitness icon. */
export function HabitLoop({ phase }: { phase: number }) {
  const copy = habitLoopCopy[phase],
    m = useMotion();
  const positions = [
    { left: '25%', top: '0%', width: '50%' },
    { left: '68%', top: '39%', width: '32%' },
    { left: '23%', top: '88%', width: '54%' },
    { left: '0%', top: '39%', width: '32%' },
  ] as const;
  return (
    <View style={{ width: '100%', aspectRatio: 0.9 }}>
      {[0, 1, 2, 3].map((index) => (
        <Animated.View
          key={index}
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: '100%',
            height: '90%',
            top: '5%',
            animationName: m.reduced
              ? undefined
              : { from: { opacity: 0.35 }, '35%': { opacity: 1 }, to: { opacity: 0.35 } },
            animationDuration: m.duration.breathe,
            animationDelay: index * m.duration.tick,
            animationIterationCount: 'infinite',
            animationTimingFunction: 'ease-in-out',
          }}>
          <Svg width="100%" height="100%" viewBox="0 0 360 360" accessible={false}>
            <G rotation={index * 90} origin="180,180">
              <Path
                d="M224 44 C266 54 298 88 308 130"
                fill="none"
                stroke={t.brand.primary}
                strokeWidth={t.stroke.chart * 2}
                strokeLinecap="round"
              />
              <Path
                d="M291 120 L309 136 L319 113"
                fill="none"
                stroke={t.brand.primary}
                strokeWidth={t.stroke.chart * 2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </G>
          </Svg>
        </Animated.View>
      ))}
      {copy.stages.map((stage, index) => (
        <View key={index} style={{ position: 'absolute', ...positions[index] }}>
          <Reveal key={stage.title} index={index}>
            <View style={{ gap: t.space.xs }}>
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
        style={{ position: 'absolute', left: '34%', top: '34%', width: '32%', alignItems: 'center', gap: t.space.sm }}>
        <LivingIcon
          name={phase === 0 ? 'phone' : phase === 1 ? 'gym' : 'lock-open'}
          size={t.space.hero}
          tint={t.brand.primary}
        />
        <Label variant="support" style={{ textAlign: 'center', color: t.brand.primary }}>
          {copy.center}
        </Label>
      </View>
    </View>
  );
}
