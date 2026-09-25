import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { tokens as t } from './tokens';

export function LockShackle({ bodyWidth }: { bodyWidth: number }) {
  const gradientId = useId().replace(/:/g, '');
  const width = bodyWidth * 0.60;
  const height = bodyWidth * 0.40;
  const thickness = bodyWidth * 0.108;
  const inset = thickness / 2;
  const radius = (width - thickness) / 2;
  if (!bodyWidth) return null;
  return (
    <View accessible={false} style={{
      alignSelf: 'center', width, height, marginBottom: -1,
      shadowColor: t.brand.lockShadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 12,
    }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} accessible={false}>
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={t.brand.primary} />
            <Stop offset="48%" stopColor={t.brand.primary} />
            <Stop offset="100%" stopColor={t.brand.primary} />
          </LinearGradient>
        </Defs>
        <Path
          d={`M ${inset} ${height} V ${width / 2} A ${radius} ${radius} 0 0 1 ${width - inset} ${width / 2} V ${height}`}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={thickness}
        />
      </Svg>
    </View>
  );
}
