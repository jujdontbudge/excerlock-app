import { View } from 'react-native';
import { Icon } from './Icon';
import { rewards, type PointsActivity } from './rewardsCopy';
import { tokens as t } from './tokens';

export function PointsToken({
  activity,
  size = t.points.pill,
  tone = 'accent',
  label,
}: {
  activity: PointsActivity;
  size?: number;
  tone?: 'accent' | 'onAccent';
  label?: boolean;
}) {
  return (
    <View
      accessible={!!label}
      accessibilityRole="image"
      accessibilityLabel={label ? rewards.token[activity] : undefined}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          width: size * 0.72,
          height: size * 0.72,
          borderRadius: t.radius.pill,
          backgroundColor: tone === 'accent' ? t.text.onAccent : t.brand.primary,
        }}
      />
      <Icon name={activity === 'gym' ? 'token-gym' : 'token-walking'} size={size} tone={tone} />
    </View>
  );
}
