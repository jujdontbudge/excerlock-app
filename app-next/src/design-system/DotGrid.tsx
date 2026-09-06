import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { tokens as t } from './tokens';
import { useMotion } from '../motion/useMotion';
import { format } from '../content/format';
export function DotGrid({
  total = 100,
  emphasized,
  label,
  columns = 20,
}: {
  total?: number;
  emphasized: number;
  label: string;
  columns?: number;
}) {
  const [ready, setReady] = useState(false),
    m = useMotion();
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityValue={{ text: format.progress(emphasized, total) }}
      style={{ alignItems: 'center', gap: t.space.xs }}>
      {Array.from({ length: Math.ceil(total / columns) }, (_, row) => (
        <View key={row} style={{ flexDirection: 'row', gap: t.space.xs }}>
          {Array.from({ length: Math.min(columns, total - row * columns) }, (_, col) => {
            const index = row * columns + col;
            return (
              <Animated.View
                key={index}
                style={{
                  width: t.layout.dot,
                  height: t.layout.dot,
                  borderRadius: t.radius.pill,
                  backgroundColor: ready && index < emphasized ? t.brand.primary : t.chart.grid,
                  opacity: ready ? 1 : 0,
                  transitionProperty: ['backgroundColor', 'opacity'],
                  transitionDuration: m.duration.standard,
                  transitionDelay: m.reduced ? 0 : index * m.duration.frame,
                }}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}
