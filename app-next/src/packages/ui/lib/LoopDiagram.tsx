import { fadeIn, fadeOut } from '../presets';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated from 'react-native-reanimated';
import { Label } from '../Label';
import { tokens as t } from '../tokens';
import { LivingIcon } from '../LivingIcon';
import { IconName } from '../Icon';
import { useMotion } from '../useMotion';
export function LoopDiagram({
  phase,
  labels,
  icons = ['bell', 'lock-open', 'clock'],
}: {
  phase: number;
  labels: readonly string[];
  icons?: readonly IconName[];
}) {
  const m = useMotion();
  return (
    <View style={{ gap: t.space.lg }}>
      <View style={{ flexDirection: 'row', gap: t.space.lg }}>
        {labels.map((label, i) => (
          <Animated.View
            key={i}
            style={{
              flex: 1,
              alignItems: 'center',
              gap: t.space.md,
              opacity: i === phase ? 1 : 0.5,
              ...m.transition('opacity', 'standard'),
            }}>
            <LivingIcon name={icons[i]} size="card" />
            <Animated.View key={label} entering={fadeIn} exiting={fadeOut}>
              <Label
                variant="support"
                style={{
                  textAlign: 'center',
                  color: i === phase ? t.text.primary : t.text.secondary,
                }}>
                {label}
              </Label>
            </Animated.View>
          </Animated.View>
        ))}
      </View>
      <Svg width="100%" height={48} viewBox="0 0 320 48">
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
