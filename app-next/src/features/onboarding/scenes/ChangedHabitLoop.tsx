import { Image, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import Animated from 'react-native-reanimated';
import { Label } from '../../../design-system';
import { Icon, IconName } from '../../../icons/Icon';
import { tokens as t } from '../../../design-system/tokens';
import { useMotion } from '../../../motion/useMotion';
import { habitLoopCopy } from '../../../content/habitLoop';
import { loopIntervention } from '../../../content/loopIntervention';
const positions = [
  { left: '32%', top: '0%', width: '36%' },
  { left: '68%', top: '20%', width: '32%' },
  { left: '68%', top: '58%', width: '32%' },
  { left: '32%', top: '81%', width: '36%' },
  { left: '0%', top: '58%', width: '32%' },
  { left: '0%', top: '20%', width: '32%' },
] as const;
/** Insertion beat: lock at 240 ms, runner at 560 ms; same six-stage geometry thereafter. */
export function ChangedHabitLoop() {
  const m = useMotion(),
    copy = habitLoopCopy[1];
  const stages = [
    copy.stages[0],
    loopIntervention.lock,
    copy.stages[1],
    loopIntervention.runner,
    copy.stages[2],
    copy.stages[3],
  ];
  const icons: IconName[] = ['bell', 'lock', 'star', 'running', 'flame', 'phone'];
  return (
    <View style={{ width: '100%', aspectRatio: 360 / 480 }}>
      <Svg width="100%" height="100%" viewBox="0 0 360 480" style={{ position: 'absolute' }} accessible={false}>
        {Array.from({ length: 6 }, (_, index) => {
          const a = ((-72 + index * 60) * Math.PI) / 180,
            b = ((-48 + index * 60) * Math.PI) / 180;
          const x = (angle: number) => 180 + 128 * Math.cos(angle),
            y = (angle: number) => 225 + 168 * Math.sin(angle);
          const endX = x(b),
            endY = y(b),
            angle = Math.atan2(168 * Math.cos(b), -128 * Math.sin(b));
          const baseX = endX - 9 * Math.cos(angle),
            baseY = endY - 9 * Math.sin(angle);
          return (
            <G key={index}>
              <Path
                d={`M${x(a)} ${y(a)} A128 168 0 0 1 ${endX} ${endY}`}
                fill="none"
                stroke={t.brand.primary}
                strokeWidth={t.stroke.chart}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d={`M${baseX + 4 * Math.sin(angle)} ${baseY - 4 * Math.cos(angle)} L${endX} ${endY} L${baseX - 4 * Math.sin(angle)} ${baseY + 4 * Math.cos(angle)} Z`}
                fill={t.brand.primary}
              />
            </G>
          );
        })}
      </Svg>
      {stages.map((stage, index) => (
        <Animated.View
          key={stage.title}
          style={{
            position: 'absolute',
            ...positions[index],
            alignItems: 'center',
            gap: t.space.xs,
            backgroundColor: t.surface.canvas,
            borderRadius: t.radius.field,
            paddingVertical: t.space.xs,
            animationName: m.reduced
              ? undefined
              : {
                  from: { opacity: 0, transform: [{ scale: 0.7 }, { translateY: t.space.md }] },
                  to: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }] },
                },
            animationDuration: m.duration.sheet,
            animationDelay: index === 1 ? m.duration.standard : index === 3 ? m.duration.standard + m.duration.slow : 0,
            animationFillMode: 'backwards',
          }}>
          {index === 1 ? (
            <Image
              source={require('../../../../assets/running-lock.png')}
              accessible={false}
              style={{ width: t.space.huge, height: t.space.huge }}
            />
          ) : (
            <Icon name={icons[index]} size={t.space.xxl} tint={t.brand.primary} />
          )}
          <Label variant="label" style={{ textAlign: 'center' }}>
            {stage.title}
          </Label>
          <Label variant="support" tone="secondary" style={{ textAlign: 'center' }}>
            {stage.detail}
          </Label>
        </Animated.View>
      ))}
      <Animated.View
        style={{
          position: 'absolute',
          left: '29%',
          top: '42%',
          width: '42%',
          animationName: m.reduced ? undefined : { from: { opacity: 0 }, to: { opacity: 1 } },
          animationDelay: m.duration.tick,
          animationDuration: m.duration.standard,
          animationFillMode: 'backwards',
        }}>
        <Label variant="label" style={{ textAlign: 'center', color: t.brand.primary }}>
          {copy.center}
        </Label>
      </Animated.View>
    </View>
  );
}
