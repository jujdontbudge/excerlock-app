import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { welcomeTokens as w } from '../../../design-system/welcomeTokens';
import { welcomeCopy as c } from '../../../content/welcome';
import { Reveal } from '../../../motion/Reveal';
import { ProgressBars } from './ProgressBars';
import { ProgressCurve } from './ProgressCurve';
import { ProgressBadge } from './ProgressBadge';
const p = w.progress;
export function ProgressArtwork() {
  const [width, setWidth] = useState<number>(p.width),
    { fontScale } = useWindowDimensions();
  const scale = Math.min(1, width / p.width);
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: (p.height + Math.max(0, fontScale - 1) * p.badge.minHeight) * scale }}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={c.progressDescription}
        style={{
          width: p.width,
          height: p.height,
          alignSelf: 'center',
          transformOrigin: 'top center',
          transform: [{ scale }],
        }}>
        <ProgressBars />
        <ProgressCurve />
        <Reveal
          index={3}
          style={{ position: 'absolute', left: p.point.x - p.point.size / 2, top: p.point.y - p.point.size / 2 }}>
          <View
            style={{
              width: p.point.size,
              height: p.point.size,
              borderRadius: p.point.size,
              borderWidth: p.point.border,
              borderColor: w.brands.white,
              backgroundColor: p.orange,
            }}
          />
        </Reveal>
        <ProgressBadge />
      </View>
    </View>
  );
}
