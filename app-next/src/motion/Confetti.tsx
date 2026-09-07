import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { SharedValue, useAnimatedProps, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';
import { tokens as t } from '../design-system/tokens';
import { confettiPieces, CONFETTI_LIFETIME, particlePosition } from './confettiPhysics';
const Piece = Animated.createAnimatedComponent(Rect);
const colors = [t.brand.lockHighlight, t.brand.decorative, t.brand.light, t.text.onAccent, t.icon.yellow];
function Particle({ index, time, width }: { index: number; time: SharedValue<number>; width: number }) {
  const piece = confettiPieces[index];
  const props = useAnimatedProps(() => {
    const p = particlePosition(index, time.value);
    const angle = (p.rotation * Math.PI) / 180;
    return {
      opacity: p.opacity,
      matrix: [Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), width / 2 + p.x, width * 0.4 + p.y],
    };
  });
  return (
    <Piece
      animatedProps={props}
      x={-3}
      y={-5}
      width={piece.shape === 2 ? 3 : piece.shape === 1 ? 8 : 6}
      height={piece.shape === 2 ? 14 : piece.shape === 1 ? 8 : 10}
      rx={piece.shape === 1 ? 4 : 1}
      fill={colors[piece.color]}
    />
  );
}
export function Confetti({ width }: { width: number }) {
  const time = useSharedValue(0),
    [visible, setVisible] = useState(true);
  const frame = useFrameCallback((f) => {
    time.value = f.timeSinceFirstFrame;
  });
  useEffect(() => {
    const timer = setTimeout(() => {
      frame.setActive(false);
      setVisible(false);
    }, CONFETTI_LIFETIME);
    return () => {
      clearTimeout(timer);
      frame.setActive(false);
    };
  }, [frame]);
  if (!visible) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0, overflow: 'visible', zIndex: 5 }}>
      <Svg width={width} height={width * 1.8} style={{ overflow: 'visible' }}>
        {confettiPieces.map((_, i) => (
          <Particle key={i} index={i} time={time} width={width} />
        ))}
      </Svg>
    </View>
  );
}
