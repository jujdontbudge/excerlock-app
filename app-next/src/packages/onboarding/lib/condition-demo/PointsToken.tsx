import { View } from 'react-native';
import { Icon } from '../../../ui/Icon';
import { tokens as t } from '../../../ui/tokens';

export function PointsToken({ size, activity, rim = false }: { size: number; activity: 'walking' | 'gym'; rim?: boolean }) {
  const ring = Math.max(1, size * 0.08);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: t.brand.primary,
        borderWidth: rim ? Math.max(1.5, size * 0.09) : 0,
        borderColor: t.text.onAccent,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <View
        style={{
          position: 'absolute',
          top: ring,
          left: ring,
          right: ring,
          bottom: ring,
          borderRadius: size / 2,
          borderWidth: ring,
          borderColor: t.surface.onAccentTrack,
        }}
      />
      <Icon name={activity === 'gym' ? 'gym' : 'walking'} size={size * 0.62} tone="onAccent" />
    </View>
  );
}
