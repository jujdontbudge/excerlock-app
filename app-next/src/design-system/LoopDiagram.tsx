import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated from 'react-native-reanimated';
import { Label } from './Label';
import { tokens as t } from './tokens';
import { LivingIcon } from '../motion/LivingIcon';
import { IconName } from '../icons/Icon';
export function LoopDiagram({
  phase,
  labels,
  icons = ['bell', 'lock-open', 'clock'],
}: {
  phase: number;
  labels: readonly string[];
  icons?: readonly IconName[];
}) {
  return (
    <View style={{ gap: t.space.lg }}>
      <View style={{ flexDirection: 'row', gap: t.space.lg }}>
        {labels.map((label, i) => (
          <Animated.View
            key={label}
            style={{
              flex: 1,
              alignItems: 'center',
              gap: t.space.md,
              opacity: i === phase ? 1 : 0.5,
              transitionProperty: 'opacity',
              transitionDuration: t.motion.duration.standard,
            }}>
            <LivingIcon name={icons[i]} size={t.space.hero} />
            <Label
              variant="support"
              style={{
                textAlign: 'center',
                color: i === phase ? t.brand.primary : t.text.secondary,
              }}>
              {label}
            </Label>
          </Animated.View>
        ))}
      </View>
      <Svg width="100%" height={t.space.huge} viewBox="0 0 320 48">
        <Path
          d="M300 4C300 48 20 48 20 4M12 12l8-8 8 8"
          fill="none"
          stroke={t.brand.light}
          strokeWidth={t.stroke.chart}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
