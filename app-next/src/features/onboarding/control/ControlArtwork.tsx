import { useState } from 'react';
import { View } from 'react-native';
import { welcomeTokens as w } from '../../../design-system/welcomeTokens';
import { ActivityTile } from './ActivityTile';
export function ControlArtwork() {
  const [width, setWidth] = useState<number>(w.canvasWidth),
    scale = Math.min(1, width / w.canvasWidth);
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: w.control.height * scale }}>
      <View
        style={{
          width: w.canvasWidth,
          height: w.control.height,
          alignSelf: 'center',
          transformOrigin: 'top center',
          transform: [{ scale }],
        }}>
        {w.control.tiles.map((tile, index) => (
          <ActivityTile key={tile.icon} index={index} />
        ))}
      </View>
    </View>
  );
}
