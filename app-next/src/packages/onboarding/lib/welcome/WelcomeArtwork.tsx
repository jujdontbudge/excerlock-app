import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { illustrationTokens as art } from '../../../ui/illustrationTokens';
import { tokens as t } from '../../../ui/tokens';
import { AppTile } from './AppTile';
import { ScheduleCard } from './ScheduleCard';
export function WelcomeArtwork() {
  const [width, setWidth] = useState<number>(art.welcome.canvasWidth);
  const { fontScale } = useWindowDimensions();
  const scale = Math.min(1, width / art.welcome.canvasWidth);
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        width: '100%',
        height: (art.welcome.heroHeight + Math.max(0, fontScale - 1) * t.layout.statusCard) * scale,
      }}>
      <View
        style={{
          position: 'absolute',
          width: art.welcome.canvasWidth,
          height: art.welcome.heroHeight,
          alignSelf: 'center',
          transformOrigin: 'top center',
          transform: [{ scale }],
        }}>
        {art.welcome.tiles.map((tile, index) => (
          <AppTile key={tile.name} index={index} />
        ))}
        <ScheduleCard />
      </View>
    </View>
  );
}
