import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { tokens as t } from './tokens';

export const shackleShape = { width: 0.6, height: 0.4, thickness: 0.108 } as const;

export function LockShackle({
  bodyWidth,
  sunk = { pinned: 0, free: 0 },
}: {
  bodyWidth: number;
  sunk?: { pinned: number; free: number };
}) {
  const gradientId = useId().replace(/:/g, '');
  const width = bodyWidth * shackleShape.width;
  const height = bodyWidth * shackleShape.height;
  const thickness = bodyWidth * shackleShape.thickness;
  const inset = thickness / 2;
  const radius = (width - thickness) / 2;
  const pinned = bodyWidth * sunk.pinned,
    free = bodyWidth * sunk.free,
    reach = height + Math.max(pinned, free);
  if (!bodyWidth) return null;
  return (
    <View accessible={false} style={{
      alignSelf: 'center', width, height: reach, marginBottom: -1 - (reach - height),
      shadowColor: t.brand.lockShadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 12,
    }}>
      <Svg width={width} height={reach} viewBox={`0 0 ${width} ${reach}`} accessible={false}>
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={t.brand.primary} />
            <Stop offset="48%" stopColor={t.brand.primary} />
            <Stop offset="100%" stopColor={t.brand.primary} />
          </LinearGradient>
        </Defs>
        <Path
          d={`M ${inset} ${height + pinned} V ${width / 2} A ${radius} ${radius} 0 0 1 ${width - inset} ${width / 2} V ${height + free}`}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={thickness}
        />
      </Svg>
    </View>
  );
}
