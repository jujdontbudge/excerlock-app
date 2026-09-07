import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { welcomeTokens as w } from '../../../design-system/welcomeTokens';
import { AppTile } from './AppTile';
import { ScheduleCard } from './ScheduleCard';
export function WelcomeArtwork() {
  const [width, setWidth] = useState<number>(w.canvasWidth);
  const { fontScale } = useWindowDimensions();
  const scale = Math.min(1, width / w.canvasWidth);
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ width: '100%', height: (w.heroHeight + Math.max(0, fontScale - 1) * w.card.minHeight) * scale }}>
      <View
        style={{
          position: 'absolute',
          width: w.canvasWidth,
          height: w.heroHeight,
          alignSelf: 'center',
          transformOrigin: 'top center',
          transform: [{ scale }],
        }}>
        {w.tiles.map((tile, index) => (
          <AppTile key={tile.name} index={index} />
        ))}
        <ScheduleCard />
      </View>
    </View>
  );
}
