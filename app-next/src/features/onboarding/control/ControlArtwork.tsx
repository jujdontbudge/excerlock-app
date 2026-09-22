import { useState } from 'react';
import { View } from 'react-native';
import { illustrationTokens as art } from '../../../design-system/illustrationTokens';
import { ActivityTile } from './ActivityTile';
export function ControlArtwork() {
  const [width, setWidth] = useState<number>(art.welcome.canvasWidth),
    scale = Math.min(1, width / art.welcome.canvasWidth);
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: art.welcome.control.height * scale }}>
      <View
        style={{
          width: art.welcome.canvasWidth,
          height: art.welcome.control.height,
          alignSelf: 'center',
          transformOrigin: 'top center',
          transform: [{ scale }],
        }}>
        {art.welcome.control.tiles.map((tile, index) => (
          <ActivityTile key={tile.icon} index={index} />
        ))}
      </View>
    </View>
  );
}
